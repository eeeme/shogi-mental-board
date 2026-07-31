/**
 * 出題範囲ユーティリティ（純粋関数）。
 * 複数の機能（①逐次タップ / ③系列記憶）で共有する。
 */
import { BOARD_SIZE, type Cell } from './coords'

/** 出題範囲。筋(file)・段(rank) それぞれの下限〜上限（1〜9、両端含む）。 */
export type CellRange = {
  fileMin: number
  fileMax: number
  rankMin: number
  rankMax: number
}

export const FULL_RANGE: CellRange = {
  fileMin: 1,
  fileMax: BOARD_SIZE,
  rankMin: 1,
  rankMax: BOARD_SIZE,
}

function clamp(n: number): number {
  return Math.min(BOARD_SIZE, Math.max(1, Math.round(n)))
}

/** 範囲を正規化（1〜9にクランプし、min<=max を保証）。 */
export function normalizeRange(range: CellRange): CellRange {
  const f1 = clamp(range.fileMin)
  const f2 = clamp(range.fileMax)
  const r1 = clamp(range.rankMin)
  const r2 = clamp(range.rankMax)
  return {
    fileMin: Math.min(f1, f2),
    fileMax: Math.max(f1, f2),
    rankMin: Math.min(r1, r2),
    rankMax: Math.max(r1, r2),
  }
}

/** マスが範囲内か。 */
export function isInRange(cell: Cell, range: CellRange): boolean {
  const n = normalizeRange(range)
  return (
    cell.file >= n.fileMin &&
    cell.file <= n.fileMax &&
    cell.rank >= n.rankMin &&
    cell.rank <= n.rankMax
  )
}

/** 範囲内のマス数。 */
export function rangeSize(range: CellRange): number {
  const n = normalizeRange(range)
  return (n.fileMax - n.fileMin + 1) * (n.rankMax - n.rankMin + 1)
}

function randInt(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

/**
 * 範囲内からランダムに 1 マスを選ぶ。
 * @param avoid 直前のマス。指定があり、範囲に 2 マス以上あれば連続で同じマスを避ける。
 */
export function randomCellInRange(
  range: CellRange,
  rng: () => number = Math.random,
  avoid?: Cell | null,
): Cell {
  const n = normalizeRange(range)
  const pick = (): Cell => ({
    file: randInt(n.fileMin, n.fileMax, rng),
    rank: randInt(n.rankMin, n.rankMax, rng),
  })
  let cell = pick()
  if (avoid && rangeSize(n) > 1) {
    let guard = 0
    while (cell.file === avoid.file && cell.rank === avoid.rank && guard < 20) {
      cell = pick()
      guard++
    }
  }
  return cell
}
