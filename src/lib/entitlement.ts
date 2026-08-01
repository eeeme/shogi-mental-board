/**
 * 課金アンロックの判定を抽象化するレイヤー。
 * 現状はダミー（常に isPro:false）。将来 RevenueCat の判定に差し替える。
 * 各モードの利用制限は必ずこの層を経由して判定する（ベタ書きしない）。
 * ※ 今は判定を通すだけで、実際のブロックはしない。
 */
import type { FeatureId } from '../features/registry'
import { now } from './time'
import {
  bump,
  dayKey,
  isLimited,
  loadUsage,
  remaining,
  saveUsage,
} from './usage'

/**
 * 課金状態。現状はダミーで常に無料ユーザー扱い。
 * 課金導入時にここを RevenueCat 判定へ差し替える。
 */
export function useEntitlement(): { isPro: boolean } {
  return { isPro: false }
}

/** 1日3回制限の対象モード（00 ただ読み上げは常に無料・無制限）。 */
const LIMITED_MODES: readonly FeatureId[] = ['tapCell', 'reverse', 'sequence']

export function isLimitedMode(id: FeatureId): boolean {
  return LIMITED_MODES.includes(id)
}

export type UsageGate = {
  isPro: boolean
  /** 無料枠を使い切ったか（Pro は常に false / 対象外モードも false）。 */
  limited: boolean
  /** 残り無料回数（無制限は Infinity）。 */
  remaining: number
  /** 1回分を記録する（モード開始時に呼ぶ）。 */
  record: () => void
}

/**
 * モードの無料利用枠ゲート。対象外モード（00 等）は常に非制限。
 * ※ 今は record/limited を提供するだけで、UI 側でブロックはしない。
 */
export function useUsageGate(id: FeatureId): UsageGate {
  const { isPro } = useEntitlement()

  if (!isLimitedMode(id)) {
    return { isPro, limited: false, remaining: Infinity, record: () => {} }
  }

  const today = dayKey(now())
  const usage = loadUsage(id)
  return {
    isPro,
    limited: isLimited(usage, today, isPro),
    remaining: remaining(usage, today, isPro),
    record: () => saveUsage(id, bump(loadUsage(id), dayKey(now()))),
  }
}
