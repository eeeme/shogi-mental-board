import { beforeEach, describe, expect, it } from 'vitest'
import { isPaidMode, useEntitlementStore } from './entitlement'

describe('entitlement', () => {
  beforeEach(() => {
    localStorage.clear()
    useEntitlementStore.setState({ isPro: false, pending: false })
  })

  it('00/01/02 は無料、03/04/05 は有料', () => {
    expect(isPaidMode('listen')).toBe(false)
    expect(isPaidMode('tapCell')).toBe(false)
    expect(isPaidMode('reverse')).toBe(false)
    expect(isPaidMode('sequence')).toBe(true)
    expect(isPaidMode('recall')).toBe(true)
    expect(isPaidMode('tsume')).toBe(true)
  })

  it('購入済みを反映すると解除され、端末にも覚えておく', () => {
    useEntitlementStore.getState().apply('owned')
    expect(useEntitlementStore.getState().isPro).toBe(true)
    expect(localStorage.getItem('smb.unlock.v1')).toBe('1')
  })

  it('支払い待ちのあいだは解除しない', () => {
    useEntitlementStore.getState().apply('pending')
    expect(useEntitlementStore.getState().isPro).toBe(false)
    expect(useEntitlementStore.getState().pending).toBe(true)
  })

  it('購入が見つからなければ（返金など）ロックに戻す', () => {
    useEntitlementStore.getState().apply('owned')
    useEntitlementStore.getState().apply('none')
    expect(useEntitlementStore.getState().isPro).toBe(false)
    expect(localStorage.getItem('smb.unlock.v1')).toBeNull()
  })
})
