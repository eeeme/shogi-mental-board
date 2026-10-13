import { describe, expect, it, vi } from 'vitest'

vi.mock('@capgo/native-purchases', () => ({
  NativePurchases: {},
  PURCHASE_TYPE: { INAPP: 'inapp', SUBS: 'subs' },
}))

const { ownedStateOf, UNLOCK_PRODUCT_ID } = await import('./billing')

describe('ownedStateOf', () => {
  it('購入済み（purchaseState=1）なら owned', () => {
    expect(ownedStateOf([{ productIdentifier: UNLOCK_PRODUCT_ID, purchaseState: '1' }])).toBe('owned')
  })

  it('支払い待ち（purchaseState=2）なら pending', () => {
    expect(ownedStateOf([{ productIdentifier: UNLOCK_PRODUCT_ID, purchaseState: '2' }])).toBe('pending')
  })

  it('別の商品しか無ければ none', () => {
    expect(ownedStateOf([{ productIdentifier: 'other', purchaseState: '1' }])).toBe('none')
  })

  it('購入が空なら none', () => {
    expect(ownedStateOf([])).toBe('none')
  })

  it('購入済みと支払い待ちが混ざっていれば owned を優先', () => {
    expect(
      ownedStateOf([
        { productIdentifier: UNLOCK_PRODUCT_ID, purchaseState: '2' },
        { productIdentifier: UNLOCK_PRODUCT_ID, purchaseState: '1' },
      ]),
    ).toBe('owned')
  })
})
