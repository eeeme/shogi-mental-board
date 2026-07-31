/**
 * モード別のUI設定（Zustand + localStorage 永続化）。
 * 盤の向き（先手/後手視点）と座標番号ラベルの表示は、各モードで独立に保持する
 * （設計変更: 全体設定から移管し、設定の持ち主をモード側に一本化）。
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BoardOrientation } from './useSettings'

/** 盤UIを持つモードのキー。 */
export type ModeKey = 'tap' | 'reverse' | 'sequence' | 'listen'

export type ModeUi = {
  orientation: BoardOrientation
  /** 座標番号ラベルの表示。 */
  showLabels: boolean
}

const DEFAULT_UI: ModeUi = { orientation: 'sente', showLabels: true }

function defaults(): Record<ModeKey, ModeUi> {
  return {
    tap: { ...DEFAULT_UI },
    reverse: { ...DEFAULT_UI },
    sequence: { ...DEFAULT_UI },
    listen: { ...DEFAULT_UI },
  }
}

type ModeSettingsStore = {
  byMode: Record<ModeKey, ModeUi>
  setOrientation: (mode: ModeKey, orientation: BoardOrientation) => void
  setShowLabels: (mode: ModeKey, showLabels: boolean) => void
}

export const useModeSettings = create<ModeSettingsStore>()(
  persist(
    (set) => ({
      byMode: defaults(),
      setOrientation: (mode, orientation) =>
        set((s) => ({
          byMode: { ...s.byMode, [mode]: { ...s.byMode[mode], orientation } },
        })),
      setShowLabels: (mode, showLabels) =>
        set((s) => ({
          byMode: { ...s.byMode, [mode]: { ...s.byMode[mode], showLabels } },
        })),
    }),
    {
      name: 'shogi-mental-board:mode-ui',
      version: 1,
    },
  ),
)

/** モードのUI設定を購読するフック。 */
export function useModeUi(mode: ModeKey): ModeUi {
  return useModeSettings((s) => s.byMode[mode])
}
