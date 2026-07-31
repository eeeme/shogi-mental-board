/**
 * 機能②「マスが光る→記号回答（逆変換）」のロジック（純粋関数）。
 * ランダムな1マスをハイライト → ユーザーが筋・段で回答 → 一致判定。
 */
import { cellsEqual, type Cell } from '../../lib/coords'
import { randomCellInRange, type CellRange } from '../../lib/range'

export type { CellRange } from '../../lib/range'
export { FULL_RANGE, normalizeRange, rangeSize } from '../../lib/range'

/** 出題（ハイライトする1マス）を引く。直前と同じマスは避ける。 */
export function randomTarget(
  range: CellRange,
  rng: () => number = Math.random,
  avoid?: Cell | null,
): Cell {
  return randomCellInRange(range, rng, avoid)
}

/** 回答の正誤判定（筋・段が一致で正解）。 */
export function judgeReverse(expected: Cell, answer: Cell): boolean {
  return cellsEqual(expected, answer)
}
