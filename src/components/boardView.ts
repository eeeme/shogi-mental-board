/**
 * ShogiBoard の見た目に関する純粋ヘルパー（テスト可能に分離）。
 * - 座標番号ラベルの位置（視点別）
 * - 星（ほし）の位置
 * - マスの視覚状態（正解 / エラー / 通常）
 */
import type { BoardOrientation } from '../store/useSettings'

const RANK_KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九']

/** 筋ラベルの並び（盤の左→右の表示順）。先手=9〜1 / 後手=1〜9。 */
export function fileHeader(orientation: BoardOrientation): number[] {
  return orientation === 'sente'
    ? [9, 8, 7, 6, 5, 4, 3, 2, 1]
    : [1, 2, 3, 4, 5, 6, 7, 8, 9]
}

/** 段ラベルの並び（盤の上→下の表示順）。先手=一〜九 / 後手=九〜一。 */
export function rankHeader(orientation: BoardOrientation): string[] {
  return orientation === 'sente' ? [...RANK_KANJI] : [...RANK_KANJI].reverse()
}

export type LabelSides = { files: 'top' | 'bottom'; ranks: 'left' | 'right' }

/**
 * ラベルを置く辺（将棋の標準表記準拠）。
 * 先手視点: 筋を上端・段を右端 / 後手視点: 盤を180°回し 筋を下端・段を左端。
 */
export function labelSides(orientation: BoardOrientation): LabelSides {
  return orientation === 'sente'
    ? { files: 'top', ranks: 'right' }
    : { files: 'bottom', ranks: 'left' }
}

/**
 * 星（ほし）の位置。盤の 1/3・2/3 の罫線交点の 4 点。
 * （3/4段の罫線 × 3/4筋・6/7筋の罫線、および 6/7段の罫線との交点に一致）
 * 180°回転で不変なので視点に依らない。
 */
export function hoshiFractions(): { x: number; y: number }[] {
  const thirds = [1 / 3, 2 / 3]
  const points: { x: number; y: number }[] = []
  for (const y of thirds) for (const x of thirds) points.push({ x, y })
  return points
}

export type CellRole = 'correct' | 'error' | 'none'

/**
 * マスの視覚状態。誤タップしたマスは error、正解マスは correct、他は none。
 * 誤答時は「押したマス(error)」と「正解マス(correct)」を同時に見せるため、
 * 両者は別マスとして共存する（優先度: error > correct）。
 */
export function cellRole(isCorrectCell: boolean, isErrorCell: boolean): CellRole {
  if (isErrorCell) return 'error'
  if (isCorrectCell) return 'correct'
  return 'none'
}
