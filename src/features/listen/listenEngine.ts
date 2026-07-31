/**
 * 機能⑧「ただ読み上げ（受動）」のループ制御（副作用は注入してテスト可能に）。
 * 座標をひたすら読み上げ続けるだけ。停止（AbortSignal）まで継続する。
 */
import type { Cell } from '../../lib/coords'

export type ListenLoopDeps = {
  /** 次に読み上げるマスを選ぶ。 */
  pickCell: () => Cell
  /** マスを読み上げる（完了で解決）。 */
  speakCell: (cell: Cell) => Promise<void>
  /** 発話間隔の待機（中断されたら reject）。 */
  waitGap: (signal: AbortSignal) => Promise<void>
  /** 停止シグナル。 */
  signal: AbortSignal
  /** 各マスの読み上げ開始時に通知（表示更新用）。 */
  onCell?: (cell: Cell) => void
}

/**
 * 停止されるまで「選ぶ→読み上げ→間隔待ち」を繰り返す。
 * @returns 読み上げ切ったマス数。
 */
export async function runListenLoop(deps: ListenLoopDeps): Promise<number> {
  let count = 0
  try {
    while (!deps.signal.aborted) {
      const cell = deps.pickCell()
      deps.onCell?.(cell)
      await deps.speakCell(cell)
      count += 1
      if (deps.signal.aborted) break
      await deps.waitGap(deps.signal)
    }
  } catch {
    // waitGap の AbortError は正常な停止
  }
  return count
}
