/**
 * 00「ただ読み上げ」の表示トグルと依存ルール（純粋関数）。
 * 音声が常時オンのため、表示は全部オフ（音だけ）でも成立する。
 *
 * 依存ルール（非対称）:
 * - 盤オフ → 光るマスも自動オフ（盤がないと光らせる場所がない）
 * - 光るマスオフ → 盤はそのまま（オフにしない）
 * - 光るマスオン → 盤も自動オン
 * - 筋ラベル / 段ラベル / 符号 は盤と独立
 */

export type DisplayToggles = {
  board: boolean
  fileLabels: boolean
  rankLabels: boolean
  symbol: boolean
  glow: boolean
}

export const DEFAULT_TOGGLES: DisplayToggles = {
  board: true,
  fileLabels: true,
  rankLabels: true,
  symbol: true,
  glow: true,
}

export type ToggleKey = keyof DisplayToggles

/**
 * 依存ルールを適用したうえでトグルを1つ切り替える。
 * 変更後の新しい状態を返す（元の状態は変更しない）。
 */
export function toggleDisplay(
  state: DisplayToggles,
  key: ToggleKey,
  value: boolean,
): DisplayToggles {
  const next: DisplayToggles = { ...state, [key]: value }

  if (key === 'board') {
    // 盤オフ → 光るマスも自動オフ。盤オンでは光るマスは変えない。
    if (!value) next.glow = false
  } else if (key === 'glow') {
    // 光るマスオン → 盤も自動オン。光るマスオフでは盤は据え置き。
    if (value) next.board = true
  }

  return next
}

/** 状態の整合性を担保（board=false のとき glow=false を強制）。 */
export function normalizeToggles(state: DisplayToggles): DisplayToggles {
  if (!state.board && state.glow) return { ...state, glow: false }
  return state
}
