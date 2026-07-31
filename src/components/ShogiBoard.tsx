/**
 * 9×9 の将棋盤。
 * - マスのタップ検出（onCellTap）／実効タップ領域は呼び出し側で幅を確保（1マス≥44px目安）
 * - 任意マスのハイライト（highlight=正解色 / errorHighlight=エラー色）を同時表示可能
 * - 盤の向き（先手/後手視点）と、視点に応じた座標番号ラベル（表示オンオフ可）
 * - 星（ほし）4点の描画（敵陣境界の目印・位置アンカー）
 * - 駒の向き付き描画（pieces）: 後続機能で使うため props を用意。最小実装を同梱。
 */
import type { ReactNode } from 'react'
import { allCells, cellLabel, cellToIndex, type Cell } from '../lib/coords'
import type { BoardOrientation } from '../store/useSettings'
import {
  cellRole,
  fileHeader,
  hoshiFractions,
  labelSides,
  rankHeader,
} from './boardView'

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
  /** ハイライトするマス（正解色）。単一 or 複数。 */
  highlight?: Cell | Cell[] | null
  /** エラー色で示すマス（誤タップしたマス）。正解色と同時表示できる。 */
  errorHighlight?: Cell | null
  /** マスのタップ時に呼ばれる。 */
  onCellTap?: (cell: Cell) => void
  /** index(0〜80) → 駒。指定があれば駒を描画する。 */
  pieces?: ReadonlyMap<number, BoardPiece>
  /** マス内に重ねる任意の内容（例: 系列記憶の順番番号）。 */
  cellContent?: (cell: Cell) => ReactNode
  /** タップを無効化する。 */
  disabled?: boolean
  /** 座標番号ラベル（筋・段）を視点に応じた辺に表示する。 */
  showLabels?: boolean
}

function toHighlightSet(highlight: ShogiBoardProps['highlight']): Set<number> {
  if (!highlight) return new Set()
  const cells = Array.isArray(highlight) ? highlight : [highlight]
  return new Set(cells.map(cellToIndex))
}

function Koma({ piece }: { piece: BoardPiece }) {
  const flipped = piece.owner === 'gote'
  return (
    <span
      className="tnum flex h-[82%] w-[72%] items-center justify-center text-sm font-semibold text-sumi-100"
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

function FileRuler({ files }: { files: number[] }) {
  return (
    <div
      aria-hidden
      className="tnum grid grid-cols-9 px-[1px] text-center text-[11px] text-sumi-500"
    >
      {files.map((f) => (
        <div key={f}>{f}</div>
      ))}
    </div>
  )
}

function RankRuler({ ranks }: { ranks: string[] }) {
  return (
    <div
      aria-hidden
      className="grid grid-rows-9 items-center py-[1px] text-center text-[11px] text-sumi-500"
    >
      {ranks.map((r, i) => (
        <div key={i}>{r}</div>
      ))}
    </div>
  )
}

export function ShogiBoard({
  orientation = 'sente',
  highlight = null,
  errorHighlight = null,
  onCellTap,
  pieces,
  cellContent,
  disabled = false,
  showLabels = false,
}: ShogiBoardProps) {
  const highlightSet = toHighlightSet(highlight)
  const errorIdx = errorHighlight ? cellToIndex(errorHighlight) : -1
  // index 昇順 = 先手視点の描画順。後手視点は 180 度回転（逆順）。
  const cells = orientation === 'sente' ? allCells() : allCells().reverse()

  const sides = labelSides(orientation)
  const files = fileHeader(orientation)
  const ranks = rankHeader(orientation)
  const filesTop = showLabels && sides.files === 'top'
  const filesBottom = showLabels && sides.files === 'bottom'
  const ranksLeft = showLabels && sides.ranks === 'left'
  const ranksRight = showLabels && sides.ranks === 'right'

  const board = (
    <div className="relative">
      <div
        className="grid aspect-square w-full grid-cols-9 grid-rows-9 overflow-hidden rounded-sm"
        style={{
          backgroundColor: 'var(--color-line)',
          gap: '1px',
          padding: '1px',
          touchAction: 'manipulation',
        }}
        role="grid"
        aria-label="将棋盤"
      >
        {cells.map((cell) => {
          const idx = cellToIndex(cell)
          const role = cellRole(highlightSet.has(idx), idx === errorIdx)
          const piece = pieces?.get(idx)
          return (
            <button
              key={idx}
              type="button"
              role="gridcell"
              aria-label={cellLabel(cell)}
              aria-pressed={role === 'correct'}
              data-role={role}
              disabled={disabled || !onCellTap}
              onClick={onCellTap ? () => onCellTap(cell) : undefined}
              className={[
                'relative flex items-center justify-center',
                'transition-colors duration-150',
                onCellTap && !disabled ? 'cursor-pointer' : 'cursor-default',
                role === 'correct' ? 'cell-glow' : '',
                role === 'error' ? 'cell-error' : '',
              ].join(' ')}
              style={{
                backgroundColor:
                  role === 'none' ? 'var(--color-ink-850)' : undefined,
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

      {/* 星（ほし）: 盤面に重ねて描画。低コントラスト・小さめ。 */}
      {hoshiFractions().map((p, i) => (
        <span
          key={i}
          className="board-hoshi"
          style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
        />
      ))}
    </div>
  )

  if (!showLabels) return <div className="w-full">{board}</div>

  // ラベル付き: 視点に応じて 筋(上 or 下) / 段(右 or 左) に配置。
  return (
    <div
      className="w-full"
      style={{
        display: 'grid',
        gridTemplateColumns: `${ranksLeft ? 'auto ' : ''}1fr${ranksRight ? ' auto' : ''}`,
        gridTemplateRows: `${filesTop ? 'auto ' : ''}1fr${filesBottom ? ' auto' : ''}`,
        gap: '3px',
        alignItems: 'center',
      }}
    >
      {filesTop && (
        <>
          {ranksLeft && <div aria-hidden />}
          <FileRuler files={files} />
          {ranksRight && <div aria-hidden />}
        </>
      )}

      {ranksLeft && <RankRuler ranks={ranks} />}
      {board}
      {ranksRight && <RankRuler ranks={ranks} />}

      {filesBottom && (
        <>
          {ranksLeft && <div aria-hidden />}
          <FileRuler files={files} />
          {ranksRight && <div aria-hidden />}
        </>
      )}
    </div>
  )
}

export default ShogiBoard
