/**
 * 全体設定ストア（Zustand + localStorage 永続化）。
 * 保存対象: 話速 / 読み流派。
 * ※ 盤の向き・番号ラベル表示は「モード別設定」（useModeSettings）に移管した。
 *   二重管理を避けるため、設定の持ち主はモード側に一本化する。
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { YomiStyle } from '../lib/coords'

/** 盤の向き。sente=先手視点（既定）/ gote=後手視点。 */
export type BoardOrientation = 'sente' | 'gote'

export type Settings = {
  /** TTS 話速（0.5〜2.0 を想定、既定 1.0）。 */
  rate: number
  /** 読みの流派（既定 modern）。 */
  yomiStyle: YomiStyle
}

export const DEFAULT_SETTINGS: Settings = {
  rate: 1.0,
  yomiStyle: 'modern',
}

type SettingsStore = Settings & {
  setRate: (rate: number) => void
  setYomiStyle: (style: YomiStyle) => void
  reset: () => void
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setRate: (rate) => set({ rate: Math.min(2, Math.max(0.5, rate)) }),
      setYomiStyle: (yomiStyle) => set({ yomiStyle }),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: 'shogi-mental-board:settings',
      version: 2,
    },
  ),
)
