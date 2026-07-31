/** 現在時刻(ms)。時刻取得を1か所に集約（テスト時に差し替え可能）。 */
export function now(): number {
  return Date.now()
}
