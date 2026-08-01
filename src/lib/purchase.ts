/**
 * 買い切り購入・購入復元の抽象化。現状はダミー（Web/PWA には購入手段がない）。
 * Android(Google Play) 版で RevenueCat(@revenuecat/purchases-capacitor) に差し替える。
 * 手順は docs/release-android.md を参照。
 */

/** Google Play 掲載URL（決まったら設定）。購入導線の案内に使う。 */
export const PLAY_STORE_URL = ''

export type PurchaseOutcome =
  | 'purchased' // 購入/復元に成功しアンロック
  | 'cancelled' // ユーザーがキャンセル
  | 'unavailable' // この環境では購入不可（Web/PWA など）

/**
 * アンロックを購入する。現状はダミー（Web では 'unavailable'）。
 * Android 版では RevenueCat の購入フローを呼び、成功時に entitlement を更新する。
 */
export async function purchaseUnlock(): Promise<PurchaseOutcome> {
  return 'unavailable'
}

/**
 * 購入を復元する（Google Play / 将来の iOS で必須）。現状はダミー。
 * Android 版では RevenueCat の restorePurchases を呼ぶ。
 */
export async function restorePurchases(): Promise<PurchaseOutcome> {
  return 'unavailable'
}
