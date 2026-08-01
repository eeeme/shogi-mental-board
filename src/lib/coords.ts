/**
 * 将棋の座標系と符号読みの純粋関数。
 *
 * ドメイン規約（CLAUDE.md / docs/design.md より）:
 * - 筋（file）= 縦の列。右から左へ 1〜9。
 * - 段（rank）= 横の行。上から下へ 一〜九（1〜9）。
 * - マス表記は「筋段」の順（例: 7六 = 7筋6段）。
 * - TTS には符号をそのまま渡さず、カタカナの読み（例 "ナナロク"）に変換する。
 * - 読みの流派: modern（よん・なな・きゅう）/ classic（し・しち・く）。既定 modern。
 *
 * index は内部の一次元インデックス（0〜80）。先手視点の描画順に対応する:
 *   列(col) = 9 - file  … file9 が左端(col0)、file1 が右端(col8)
 *   行(row) = rank - 1   … rank1 が上端(row0)、rank9 が下端(row8)
 *   index   = row * 9 + col
 */

export type Cell = { file: number; rank: number }

export type YomiStyle = 'modern' | 'classic'

export const BOARD_SIZE = 9
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE

/** 段を漢数字で表示するための表（1〜9 → 一〜九）。 */
const RANK_KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九'] as const

/**
 * 数字（1〜9）の読み。流派で 4・7・9 が変わる。
 * 筋・段のどちらの読みにも同じ表を用いる（例: 7六 → "ナナ" + "ロク"）。
 *
 * **カタカナで渡す**: ひらがなだと日本語TTSが文頭の「は」を助詞と解釈して "wa" と
 * 読むため、"はちきゅう" が「わちきゅう」になる不具合が出る。カタカナ("ハチキュウ")なら回避。
 * 8 は必ず「ハチ」と読ませる。
 * 2 と 5 は 1 モーラで音が飲まれるため伸ばす: 2="ニー" / 5="ゴー"（筋・段の両方）。
 * 実機で不自然なら「ニィ」「ゴゥ」にフォールバックしてよい。
 */
const NUM_YOMI: Record<YomiStyle, readonly string[]> = {
  modern: ['イチ', 'ニー', 'サン', 'ヨン', 'ゴー', 'ロク', 'ナナ', 'ハチ', 'キュウ'],
  classic: ['イチ', 'ニー', 'サン', 'シ', 'ゴー', 'ロク', 'シチ', 'ハチ', 'ク'],
}

function assertDigit(n: number, name: string): void {
  if (!Number.isInteger(n) || n < 1 || n > BOARD_SIZE) {
    throw new RangeError(`${name} は 1〜${BOARD_SIZE} の整数である必要があります: ${n}`)
  }
}

function assertCell(cell: Cell): void {
  assertDigit(cell.file, 'file')
  assertDigit(cell.rank, 'rank')
}

/** 数字 1〜9 の読み仮名を返す。 */
export function numYomi(n: number, style: YomiStyle = 'modern'): string {
  assertDigit(n, 'n')
  return NUM_YOMI[style][n - 1]
}

/** 筋（1〜9）の読み仮名。 */
export function fileYomi(file: number, style: YomiStyle = 'modern'): string {
  assertDigit(file, 'file')
  return numYomi(file, style)
}

/** 段（1〜9）の読み仮名。 */
export function rankYomi(rank: number, style: YomiStyle = 'modern'): string {
  assertDigit(rank, 'rank')
  return numYomi(rank, style)
}

/** マスの読み仮名（筋→段の順）。例: {file:7,rank:6} → "ナナロク"。 */
export function cellYomi(cell: Cell, style: YomiStyle = 'modern'): string {
  assertCell(cell)
  return fileYomi(cell.file, style) + rankYomi(cell.rank, style)
}

/** マスの表示ラベル（筋は算用数字・段は漢数字）。例: {file:7,rank:6} → "7六"。 */
export function cellLabel(cell: Cell): string {
  assertCell(cell)
  return `${cell.file}${RANK_KANJI[cell.rank - 1]}`
}

/** マス → 内部インデックス（0〜80、先手視点の描画順）。 */
export function cellToIndex(cell: Cell): number {
  assertCell(cell)
  const col = BOARD_SIZE - cell.file
  const row = cell.rank - 1
  return row * BOARD_SIZE + col
}

/** 内部インデックス（0〜80）→ マス。 */
export function indexToCell(index: number): Cell {
  if (!Number.isInteger(index) || index < 0 || index >= CELL_COUNT) {
    throw new RangeError(`index は 0〜${CELL_COUNT - 1} の整数である必要があります: ${index}`)
  }
  const row = Math.floor(index / BOARD_SIZE)
  const col = index % BOARD_SIZE
  return { file: BOARD_SIZE - col, rank: row + 1 }
}

/** 全 81 マスを先手視点の描画順（index 昇順）で返す。 */
export function allCells(): Cell[] {
  const cells: Cell[] = []
  for (let i = 0; i < CELL_COUNT; i++) cells.push(indexToCell(i))
  return cells
}

/** 2 つのマスが同一か。 */
export function cellsEqual(a: Cell, b: Cell): boolean {
  return a.file === b.file && a.rank === b.rank
}
