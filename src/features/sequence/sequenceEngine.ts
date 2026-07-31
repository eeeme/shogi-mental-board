/**
 * 機能③「系列記憶（順番タップ→答え合わせ）」のロジック（純粋関数）。
 * 座標を N 個順に提示 → 記憶 → 示された順にタップ → 順序・位置の一致で判定。
 */
import { cellsEqual, type Cell } from '../../lib/coords'
import { randomCellInRange, type CellRange } from '../../lib/range'

export type { CellRange } from '../../lib/range'
export { FULL_RANGE, normalizeRange, rangeSize } from '../../lib/range'

/** 提示手段（チャンネル）。最低 1 つは on でなければ問題が伝わらない。 */
export type Channel = 'board' | 'symbol' | 'audio'
export type Channels = Record<Channel, boolean>

export const ALL_CHANNELS: Channel[] = ['board', 'symbol', 'audio']

/** 少なくとも 1 つの提示手段が on か。 */
export function atLeastOneOn(channels: Channels): boolean {
  return ALL_CHANNELS.some((c) => channels[c])
}

/**
 * チャンネルの on/off をトグルする。ただし「最後の 1 つ」は off にできない
 * （必ず 1 つは on を維持する）。制約に反する場合は元の状態を返す。
 */
export function toggleChannel(channels: Channels, channel: Channel): Channels {
  const next: Channels = { ...channels, [channel]: !channels[channel] }
  if (!atLeastOneOn(next)) return channels
  return next
}

/**
 * 出題範囲から N 個の系列を生成する。連続で同じマスは避ける
 * （範囲が 1 マスしかない場合を除く）。
 */
export function generateSequence(
  n: number,
  range: CellRange,
  rng: () => number = Math.random,
): Cell[] {
  const count = Math.max(1, Math.floor(n))
  const cells: Cell[] = []
  let prev: Cell | null = null
  for (let i = 0; i < count; i++) {
    const cell = randomCellInRange(range, rng, prev)
    cells.push(cell)
    prev = cell
  }
  return cells
}

export type SequenceJudgement = {
  /** 順序・位置がすべて一致したか（＝正解）。 */
  correct: boolean
  /** 位置が一致した手数（同じ index で同じマス）。部分一致の記録用。 */
  matched: number
  /** 出題数。 */
  total: number
}

/**
 * 系列の答え合わせ。**順序も一致で正解**。
 * 位置のみ一致・部分一致は matched に残すが correct にはしない。
 */
export function judgeSequence(
  expected: Cell[],
  actual: Cell[],
): SequenceJudgement {
  const total = expected.length
  let matched = 0
  for (let i = 0; i < total; i++) {
    const a = actual[i]
    if (a && cellsEqual(expected[i], a)) matched += 1
  }
  const correct = total > 0 && actual.length === total && matched === total
  return { correct, matched, total }
}
