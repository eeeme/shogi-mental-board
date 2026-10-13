/**
 * Google Play の課金（買い切り）を呼ぶ層。@capgo/native-purchases を使う（定跡帳と同じ）。
 * サーバーは持たない。購入状況は毎回 Google Play に問い合わせる。
 *
 * 注意: Android 版プラグインは呼び出しのたびに Google Play との接続を作り直し、
 * その前に既存の接続を閉じる。同時に呼ぶと先の取得が失敗するので、必ず1本ずつ順番に流す。
 */
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases'

/** Play Console の「アプリ内アイテム」で作る商品 ID（買い切り・300円）。 */
export const UNLOCK_PRODUCT_ID = 'unlock_all'

/** Android の購入状態。1=購入済み / 2=保留（コンビニ払いなどで支払い待ち）。 */
const PURCHASED = '1'
const PENDING = '2'

let queue: Promise<unknown> = Promise.resolve()
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn)
  queue = run.catch(() => undefined)
  return run
}

/** 一時的な失敗に備えて、少し待って1回だけやり直す。 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch {
    await new Promise((r) => setTimeout(r, 800))
    return fn()
  }
}

export type OwnedState = 'owned' | 'pending' | 'none'

type PurchaseLike = {
  productIdentifier?: string
  purchaseState?: string
  isAcknowledged?: boolean
  purchaseToken?: string
}

/** 購入一覧から、アンロック商品の状態を読み取る（純粋関数）。 */
export function ownedStateOf(purchases: readonly PurchaseLike[]): OwnedState {
  const mine = purchases.filter((p) => p.productIdentifier === UNLOCK_PRODUCT_ID)
  if (mine.some((p) => p.purchaseState === PURCHASED || p.purchaseState === undefined)) return 'owned'
  if (mine.some((p) => p.purchaseState === PENDING)) return 'pending'
  return 'none'
}

/**
 * いまアンロック商品を持っているかを Google Play に問い合わせる。
 * 未承認（アプリが途中で落ちた等）の購入が見つかったら、ここで承認しておく
 * （承認しないと3日後に自動で返金されるため）。
 */
export async function queryOwned(): Promise<OwnedState> {
  const { purchases } = await withRetry(() =>
    serial(() => NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP })),
  )
  for (const p of purchases as PurchaseLike[]) {
    if (
      p.productIdentifier === UNLOCK_PRODUCT_ID &&
      p.purchaseState === PURCHASED &&
      p.isAcknowledged === false &&
      p.purchaseToken
    ) {
      const token = p.purchaseToken
      await serial(() => NativePurchases.acknowledgePurchase({ purchaseToken: token })).catch(() => undefined)
    }
  }
  return ownedStateOf(purchases as PurchaseLike[])
}

/** 表示用の価格（例「¥300」）。取れなければ null。 */
export async function queryPrice(): Promise<string | null> {
  try {
    const { products } = await withRetry(() =>
      serial(() =>
        NativePurchases.getProducts({
          productIdentifiers: [UNLOCK_PRODUCT_ID],
          productType: PURCHASE_TYPE.INAPP,
        }),
      ),
    )
    return products[0]?.priceString ?? null
  } catch {
    return null
  }
}

/** 購入画面を出す。キャンセル・失敗は例外になる。 */
export async function buyUnlock(): Promise<OwnedState> {
  const tx = await serial(() =>
    NativePurchases.purchaseProduct({
      productIdentifier: UNLOCK_PRODUCT_ID,
      productType: PURCHASE_TYPE.INAPP,
      isConsumable: false,
    }),
  )
  return ownedStateOf([tx as PurchaseLike])
}
