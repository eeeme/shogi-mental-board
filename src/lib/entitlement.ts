/**
 * 課金アンロックの判定。
 * モデル: **非消費型の買い切り（300円）**。1つのアンロックで 03/04/05＋バックグラウンド再生が開く。
 * 回数制限（1日N回）は無し。00/01/02 は完全無料・無制限。
 *
 * 購入状況は Google Play が正（billing.ts で問い合わせる）。
 * 起動直後や電波が無いときに一瞬ロックに戻らないよう、最後に確認できた状態を端末に覚えておく。
 * 各モードのロック判定は必ずこの層を経由する（ベタ書きしない）。
 */
import { create } from 'zustand'
import type { FeatureId } from '../features/registry'
import type { OwnedState } from './billing'

const CACHE_KEY = 'smb.unlock.v1'

function readCache(): boolean {
  try {
    return localStorage.getItem(CACHE_KEY) === '1'
  } catch {
    return false
  }
}

function writeCache(isPro: boolean): void {
  try {
    if (isPro) localStorage.setItem(CACHE_KEY, '1')
    else localStorage.removeItem(CACHE_KEY)
  } catch {
    // 保存できなくても、次回起動時に Google Play へ問い合わせ直すので問題ない
  }
}

type EntitlementStore = {
  isPro: boolean
  /** 支払い待ち（コンビニ払い等）の購入がある。 */
  pending: boolean
  /** Google Play に問い合わせた結果を反映する。 */
  apply: (state: OwnedState) => void
}

export const useEntitlementStore = create<EntitlementStore>((set) => ({
  isPro: readCache(),
  pending: false,
  apply: (state) => {
    const isPro = state === 'owned'
    writeCache(isPro)
    set({ isPro, pending: state === 'pending' })
  },
}))

/** 課金状態。 */
export function useEntitlement(): { isPro: boolean } {
  const isPro = useEntitlementStore((s) => s.isPro)
  return { isPro }
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
