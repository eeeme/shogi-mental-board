/**
 * 買い切り購入・購入の復元。
 * Android アプリ版は Google Play の課金（billing.ts）を使う。ブラウザ版には購入手段がないので 'unavailable'。
 * 結果は entitlement ストアに反映する。
 */
import { useEntitlementStore } from './entitlement'
import { isNative } from './nativeSpeech'

export const APP_ID = 'com.eeeme.shogimentalboard'
/** Google Play 掲載URL。ブラウザ版から購入導線を案内するのに使う。 */
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${APP_ID}`

export type PurchaseOutcome =
  | 'purchased' // 購入/復元に成功しアンロック
  | 'pending' // 支払い待ち（コンビニ払いなど）。支払いが済むと開く
  | 'cancelled' // ユーザーがキャンセル、または失敗
  | 'not-found' // 復元: 購入が見つからない
  | 'unavailable' // この環境では購入不可（ブラウザ版）

function toOutcome(state: 'owned' | 'pending' | 'none', ifNone: PurchaseOutcome): PurchaseOutcome {
  if (state === 'owned') return 'purchased'
  if (state === 'pending') return 'pending'
  return ifNone
}

/** 起動時などに、Google Play の購入状況を確かめて反映する。失敗したら前回の状態のまま。 */
export async function refreshEntitlement(): Promise<void> {
  if (!isNative) return
  try {
    const { queryOwned } = await import('./billing')
    useEntitlementStore.getState().apply(await queryOwned())
  } catch {
    // 電波が無いなど。前回確認できた状態を使い続ける
  }
}

/** 表示用の価格（例「¥300」）。取れなければ null。 */
export async function getUnlockPrice(): Promise<string | null> {
  if (!isNative) return null
  const { queryPrice } = await import('./billing')
  return queryPrice()
}

/** アンロックを購入する。 */
export async function purchaseUnlock(): Promise<PurchaseOutcome> {
  if (!isNative) return 'unavailable'
  try {
    const { buyUnlock, queryOwned } = await import('./billing')
    let state = await buyUnlock()
    // 購入直後の結果が曖昧なときは、念のため購入一覧で確かめる
    if (state === 'none') state = await queryOwned().catch(() => state)
    useEntitlementStore.getState().apply(state)
    return toOutcome(state, 'cancelled')
  } catch {
    // キャンセル。ただし「すでに購入済み」で弾かれた場合に備えて確かめ直す
    await refreshEntitlement()
    return useEntitlementStore.getState().isPro ? 'purchased' : 'cancelled'
  }
}

/** 購入を復元する（機種変更・再インストール後など）。 */
export async function restorePurchases(): Promise<PurchaseOutcome> {
  if (!isNative) return 'unavailable'
  try {
    const { queryOwned } = await import('./billing')
    const state = await queryOwned()
    useEntitlementStore.getState().apply(state)
    return toOutcome(state, 'not-found')
  } catch {
    return 'cancelled'
  }
}
