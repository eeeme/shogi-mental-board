/**
 * 機能①「読み上げ→マス押下（逐次1問1答）」のロジック（純粋関数）。
 * 座標を1つ提示 → 該当マスを即タップ → 正誤判定 → 次の1問。
 */
import { cellsEqual, type Cell } from '../../lib/coords'
import { randomCellInRange, type CellRange } from '../../lib/range'

export type { CellRange } from '../../lib/range'
export { FULL_RANGE, normalizeRange, rangeSize } from '../../lib/range'

/**
 * 提示手段。符号（記号表示）と音声のどちらか一方をオフにできるが、
 * **両方オフは不可**（盤面は常にオンなので、ここには含めない）。
 */
export type TapChannels = { symbol: boolean; audio: boolean }

/** 少なくとも一方（符号 or 音声）がオンか。 */
export function tapChannelsValid(channels: TapChannels): boolean {
  return channels.symbol || channels.audio
}

/**
 * 符号/音声のトグル。ただし両方オフにはできない
 * （最後の1つは維持）。制約に反する場合は元の状態を返す。
 */
export function toggleTapChannel(
  channels: TapChannels,
  key: keyof TapChannels,
): TapChannels {
  const next: TapChannels = { ...channels, [key]: !channels[key] }
  if (!tapChannelsValid(next)) return channels
  return next
}

/** 次の出題マスを引く（直前と同じマスは避ける）。 */
export function nextQuestion(
  range: CellRange,
  rng: () => number = Math.random,
  avoid?: Cell | null,
): Cell {
  return randomCellInRange(range, rng, avoid)
}

/** タップの正誤判定（出題マスと一致で正解）。 */
export function judgeTap(expected: Cell, tapped: Cell): boolean {
  return cellsEqual(expected, tapped)
}
