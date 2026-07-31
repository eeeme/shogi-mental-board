import { describe, it, expect } from 'vitest'
import {
  cellRole,
  fileHeader,
  hoshiFractions,
  labelSides,
  rankHeader,
} from './boardView'

describe('番号ラベルの視点別切替', () => {
  it('筋ヘッダ: 先手=9〜1 / 後手=1〜9', () => {
    expect(fileHeader('sente')).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1])
    expect(fileHeader('gote')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('段ヘッダ: 先手=一〜九 / 後手=九〜一', () => {
    expect(rankHeader('sente')).toEqual([
      '一', '二', '三', '四', '五', '六', '七', '八', '九',
    ])
    expect(rankHeader('gote')).toEqual([
      '九', '八', '七', '六', '五', '四', '三', '二', '一',
    ])
  })

  it('ラベルの辺: 先手=筋上端/段右端, 後手=筋下端/段左端', () => {
    expect(labelSides('sente')).toEqual({ files: 'top', ranks: 'right' })
    expect(labelSides('gote')).toEqual({ files: 'bottom', ranks: 'left' })
  })
})

describe('星（ほし）', () => {
  it('1/3・2/3 の交点 4 点', () => {
    const pts = hoshiFractions()
    expect(pts).toHaveLength(4)
    const xs = new Set(pts.map((p) => Math.round(p.x * 3)))
    const ys = new Set(pts.map((p) => Math.round(p.y * 3)))
    expect([...xs].sort()).toEqual([1, 2])
    expect([...ys].sort()).toEqual([1, 2])
  })
})

describe('マスの視覚状態（①誤タップ表示ロジック）', () => {
  it('エラー > 正解 > 通常 の優先度', () => {
    expect(cellRole(false, false)).toBe('none')
    expect(cellRole(true, false)).toBe('correct')
    expect(cellRole(false, true)).toBe('error')
    expect(cellRole(true, true)).toBe('error')
  })
})
