import { describe, it, expect } from 'vitest'
import {
  DEFAULT_TOGGLES,
  normalizeToggles,
  toggleDisplay,
  type DisplayToggles,
} from './displayToggles'

const ON: DisplayToggles = {
  board: true,
  fileLabels: true,
  rankLabels: true,
  symbol: true,
  glow: true,
}

describe('toggleDisplay 依存ルール', () => {
  it('盤オフ → 光るマスも自動オフ', () => {
    const next = toggleDisplay(ON, 'board', false)
    expect(next.board).toBe(false)
    expect(next.glow).toBe(false)
  })

  it('光るマスオフ → 盤はオフにならない（そのまま）', () => {
    const next = toggleDisplay(ON, 'glow', false)
    expect(next.glow).toBe(false)
    expect(next.board).toBe(true)
  })

  it('光るマスオン → 盤も自動オン', () => {
    const boardOff: DisplayToggles = { ...ON, board: false, glow: false }
    const next = toggleDisplay(boardOff, 'glow', true)
    expect(next.glow).toBe(true)
    expect(next.board).toBe(true)
  })

  it('盤オンでは光るマスの状態を変えない', () => {
    const boardOff: DisplayToggles = { ...ON, board: false, glow: false }
    const next = toggleDisplay(boardOff, 'board', true)
    expect(next.board).toBe(true)
    expect(next.glow).toBe(false) // 勝手にオンにしない
  })

  it('筋/段ラベル・符号は盤と独立して切替できる', () => {
    expect(toggleDisplay(ON, 'fileLabels', false)).toMatchObject({
      board: true,
      fileLabels: false,
    })
    expect(toggleDisplay(ON, 'rankLabels', false).board).toBe(true)
    expect(toggleDisplay(ON, 'symbol', false).board).toBe(true)
  })

  it('全部オフ（音だけ）も作れる', () => {
    let s = DEFAULT_TOGGLES
    s = toggleDisplay(s, 'glow', false)
    s = toggleDisplay(s, 'board', false)
    s = toggleDisplay(s, 'fileLabels', false)
    s = toggleDisplay(s, 'rankLabels', false)
    s = toggleDisplay(s, 'symbol', false)
    expect(s).toEqual({
      board: false,
      fileLabels: false,
      rankLabels: false,
      symbol: false,
      glow: false,
    })
  })
})

describe('normalizeToggles', () => {
  it('board=false かつ glow=true は glow=false に矯正', () => {
    expect(
      normalizeToggles({
        board: false,
        fileLabels: false,
        rankLabels: false,
        symbol: false,
        glow: true,
      }).glow,
    ).toBe(false)
  })
})
