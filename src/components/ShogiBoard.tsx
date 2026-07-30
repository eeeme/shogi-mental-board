/**
 * 9×9 の将棋盤。
 * - マスのタップ検出（onCellTap）
 * - 任意マスのハイライト（highlight, signature の「光る一マス」）
 * - 盤の向き（先手視点/後手視点）
 * - 駒の向き付き描画（pieces）: 後続機能で使うため props を用意。最小実装を同梱。
 */
import type { ReactNode } from 'react'
import { allCells, cellLabel, cellToIndex, type Cell } from '../lib/coords'
import type { BoardOrientation } from '../store/useSettings'

/** 盤上の駒（描画用の最小情報）。駒種は将来の機能で拡張。 */
export type BoardPiece = {
  /** 駒に表示する文字（例: "歩"）。 */
  label: string
  /** 所有者。sente=上向き / gote=反転。 */
  owner: BoardOrientation
}

export type ShogiBoardProps = {
  /** 盤の向き。既定 sente（先手視点）。 */
  orientation?: BoardOrientation
  /** ハイライトするマス（単一 or 複数）。 */
  highlight?: Cell | Cell[] | null
  /** マスのタップ時に呼ばれる。 */
  onCellTap?: (cell: Cell) => void
  /** index(0〜80) → 駒。指定があれば駒を描画する。 */
  pieces?: ReadonlyMap<number, BoardPiece>
  /** マス内に重ねる任意の内容（例: 系列記憶の順番番号）。 */
  cellContent?: (cell: Cell) => ReactNode
  /** タップを無効化する。 */
  disabled?: boolean
  /** 盤の外側に筋（上）・段（右）の目盛を表示する。 */
  showRulers?: boolean
}

const RANK_KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九']

function toHighlightSet(highlight: ShogiBoardProps['highlight']): Set<number> {
  if (!highlight) return new Set()
  const cells = Array.isArray(highlight) ? highlight : [highlight]
  return new Set(cells.map(cellToIndex))
}

function Koma({ piece }: { piece: BoardPiece }) {
  // 五角形の駒。後手は 180 度回転で反転を表現。
  const flipped = piece.owner === 'gote'
  return (
    <span
      className="tnum flex h-[82%] w-[72%] items-center justify-center text-[3.2vw] font-semibold text-sumi-100 sm:text-base"
      style={{
        backgroundColor: 'var(--color-kaya)',
        clipPath: 'polygon(50% 0%, 90% 25%, 100% 100%, 0% 100%, 10% 25%)',
        transform: flipped ? 'rotate(180deg)' : undefined,
      }}
    >
      {piece.label}
    </span>
  )
}

export function ShogiBoard({
  orientation = 'sente',
  highlight = null,
  onCellTap,
  pieces,
  cellContent,
  disabled = false,
  showRulers = false,
}: ShogiBoardProps) {
  const highlightSet = toHighlightSet(highlight)
  // index 昇順 = 先手視点の描画順。後手視点は 180 度回転（逆順）。
  const cells = orientation === 'sente' ? allCells() : allCells().reverse()
  const fileHeader =
    orientation === 'sente'
      ? [9, 8, 7, 6, 5, 4, 3, 2, 1]
      : [1, 2, 3, 4, 5, 6, 7, 8, 9]
  const rankHeader =
    orientation === 'sente'
      ? RANK_KANJI
      : [...RANK_KANJI].reverse()

  return (
    <div
      className="w-full"
      style={{
        display: 'grid',
        gridTemplateColumns: showRulers ? 'auto 1fr auto' : '1fr',
        gridTemplateRows: showRulers ? 'auto 1fr' : '1fr',
        gap: '4px',
      }}
    >
      {showRulers && <div aria-hidden />}
      {showRulers && (
        <div
          aria-hidden
          className="tnum grid grid-cols-9 text-center text-xs text-sumi-500"
        >
          {fileHeader.map((f) => (
            <div key={f}>{f}</div>
          ))}
        </div>
      )}
      {showRulers && <div aria-hidden />}

      {showRulers && (
        <div
          aria-hidden
          className="grid grid-rows-9 items-center text-center text-xs text-sumi-500"
        >
          {rankHeader.map((r, i) => (
            <div key={i}>{r}</div>
          ))}
        </div>
      )}

      <div
        className="grid aspect-square w-full grid-cols-9 grid-rows-9 overflow-hidden rounded-sm"
        style={{
          backgroundColor: 'var(--color-line)',
          gap: '1px',
          padding: '1px',
        }}
        role="grid"
        aria-label="将棋盤"
      >
        {cells.map((cell) => {
          const idx = cellToIndex(cell)
          const isHighlighted = highlightSet.has(idx)
          const piece = pieces?.get(idx)
          return (
            <button
              key={idx}
              type="button"
              role="gridcell"
              aria-label={cellLabel(cell)}
              aria-pressed={isHighlighted}
              disabled={disabled || !onCellTap}
              onClick={onCellTap ? () => onCellTap(cell) : undefined}
              className={[
                'relative flex items-center justify-center',
                'transition-colors duration-150',
                onCellTap && !disabled ? 'cursor-pointer' : 'cursor-default',
                isHighlighted ? 'cell-glow' : '',
              ].join(' ')}
              style={{
                backgroundColor: isHighlighted ? undefined : 'var(--color-ink-850)',
              }}
            >
              {piece && <Koma piece={piece} />}
              {cellContent && (
                <span className="tnum pointer-events-none absolute text-xs text-sumi-300">
                  {cellContent(cell)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {showRulers && <div aria-hidden />}
    </div>
  )
}

export default ShogiBoard
