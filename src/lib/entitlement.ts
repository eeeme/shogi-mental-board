/**
 * 課金アンロックの判定を抽象化するレイヤー。
 * モデル: **非消費型の買い切り**。1つのアンロックで 03/04/05＋バックグラウンド再生が開く。
 * 回数制限（1日N回）は廃止。00/01/02 は完全無料・無制限。
 *
 * 現状は `useEntitlement()` がダミーで常に `isPro:false` を返す。
 * Android(Google Play) 版で RevenueCat に差し替える（docs/release-android.md）。
 * 各モードのロック判定は必ずこの層を経由する（ベタ書きしない）。
 */
import type { FeatureId } from '../features/registry'

/**
 * 課金状態。現状はダミーで常に未購入。
 * 課金導入時にここを RevenueCat の判定へ差し替える。
 */
export function useEntitlement(): { isPro: boolean } {
  return { isPro: false }
}

/**
 * 買い切りアンロックの対象モード（＝未購入だとロック）。
 * 00/01/02 は常に無料。03 系列記憶は有料。04/05 は未実装だが購入者に今後追加（追加課金なし）。
 */
const PAID_MODES: readonly FeatureId[] = ['sequence', 'recall', 'tsume']

export function isPaidMode(id: FeatureId): boolean {
  return PAID_MODES.includes(id)
}

/** モードのロック状態を返す。未購入かつ有料モードならロック。 */
export function useFeatureLock(id: FeatureId): {
  isPro: boolean
  locked: boolean
} {
  const { isPro } = useEntitlement()
  return { isPro, locked: isPaidMode(id) && !isPro }
}

/** バックグラウンド再生（00の有料機能）が使えるか。 */
export function useBackgroundUnlocked(): boolean {
  return useEntitlement().isPro
}
