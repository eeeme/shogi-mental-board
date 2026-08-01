/**
 * モード説明用の小さな自動再生デモ。GIFではなく実物の ShogiBoard を使う
 * （UI変更に自動追従・容量ゼロ・高解像度でも綺麗）。数秒でループ再生する。
 */
import { useEffect, useState } from 'react'
import { ShogiBoard } from './ShogiBoard'
import { cellLabel, cellToIndex, cellYomi, type Cell } from '../lib/coords'
import type { FeatureId } from '../features/registry'

type Frame = { cells: { cell: Cell; n?: number }[]; caption: string }

const A: Cell = { file: 7, rank: 6 }
const B: Cell = { file: 3, rank: 4 }
const C: Cell = { file: 5, rank: 5 }

function framesFor(id: FeatureId): Frame[] {
  switch (id) {
    case 'tapCell':
      return [A, B].flatMap((cell) => [
        { cells: [], caption: `「${cellYomi(cell)}」と出題` },
        { cells: [{ cell }], caption: `${cellLabel(cell)} をタップ → 正解` },
      ])
    case 'reverse':
      return [A, B].flatMap((cell) => [
        { cells: [{ cell }], caption: '光ったマスは？' },
        { cells: [{ cell }], caption: `→ ${cellLabel(cell)}` },
      ])
    case 'sequence':
      return [
        { cells: [{ cell: A, n: 1 }], caption: '順に提示…' },
        {
          cells: [
            { cell: A, n: 1 },
            { cell: B, n: 2 },
          ],
          caption: '順に提示…',
        },
        {
          cells: [
            { cell: A, n: 1 },
            { cell: B, n: 2 },
            { cell: C, n: 3 },
          ],
          caption: '記憶する',
        },
        {
          cells: [
            { cell: A, n: 1 },
            { cell: B, n: 2 },
            { cell: C, n: 3 },
          ],
          caption: '同じ順にタップ → 答え合わせ',
        },
      ]
    default:
      // ⑧ただ読み上げ 等・受動系は座標を読み上げる雰囲気を見せる
      return [A, B, C].map((cell) => ({
        cells: [],
        caption: `♪ ${cellYomi(cell)}`,
      }))
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function ModeDemo({ id }: { id: FeatureId }) {
  const frames = framesFor(id)
  const [i, setI] = useState(0)

  useEffect(() => {
    // モーション低減設定を尊重: 自動再生せず代表フレームを静止表示。
    if (prefersReducedMotion()) return
    const timer = setInterval(() => {
      setI((prev) => (prev + 1) % frames.length)
    }, 1100)
    return () => clearInterval(timer)
    // frames は id 依存（長さで判定）。id が変わったら作り直す。
  }, [id, frames.length])

  const frame = frames[i] ?? frames[0]
  const highlight = frame.cells.map((c) => c.cell)
  const orderByIndex = new Map<number, number>()
  for (const c of frame.cells) {
    if (c.n != null) orderByIndex.set(cellToIndex(c.cell), c.n)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full max-w-[200px]">
        <ShogiBoard
          highlight={highlight}
          cellContent={(cell) => orderByIndex.get(cellToIndex(cell)) ?? null}
        />
      </div>
      <p className="tnum min-h-[1.25rem] text-center text-sm text-sumi-300">
        {frame.caption}
      </p>
    </div>
  )
}

export default ModeDemo
