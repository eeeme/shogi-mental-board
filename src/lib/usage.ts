/**
 * 1日あたりの無料利用回数のカウントと日付リセット（純粋関数）＋ localStorage 保存。
 * 課金アンロックの下準備。実際のブロックはまだ行わず、判定だけ通す。
 */

/** 無料枠: 1日3回まで（01〜03 モード）。 */
export const FREE_DAILY_LIMIT = 3

export type Usage = { day: string; count: number }

/** ローカル日付キー（YYYY-MM-DD）。日付境界の判定に使う。 */
export function dayKey(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 1回分を加算。日付が変わっていたら 1 にリセット。 */
export function bump(prev: Usage | null, todayKey: string): Usage {
  if (!prev || prev.day !== todayKey) return { day: todayKey, count: 1 }
  return { day: todayKey, count: prev.count + 1 }
}

/** 今日の使用回数（日付が違えば 0）。 */
export function usedToday(prev: Usage | null, todayKey: string): number {
  return prev && prev.day === todayKey ? prev.count : 0
}

/** 残り無料回数。Pro は無制限（Infinity）。 */
export function remaining(
  prev: Usage | null,
  todayKey: string,
  isPro: boolean,
  limit: number = FREE_DAILY_LIMIT,
): number {
  if (isPro) return Infinity
  return Math.max(0, limit - usedToday(prev, todayKey))
}

/** 無料枠を使い切ったか。Pro は常に false。 */
export function isLimited(
  prev: Usage | null,
  todayKey: string,
  isPro: boolean,
  limit: number = FREE_DAILY_LIMIT,
): boolean {
  if (isPro) return false
  return usedToday(prev, todayKey) >= limit
}

// --- localStorage 保存 ---

const PREFIX = 'shogi-mental-board:usage:'

export function loadUsage(id: string): Usage | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(PREFIX + id)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Usage
    if (typeof parsed.day === 'string' && typeof parsed.count === 'number') {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function saveUsage(id: string, usage: Usage): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(usage))
  } catch {
    // 保存失敗は致命的ではない
  }
}
