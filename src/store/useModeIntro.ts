/**
 * モード説明モーダルの「次回から表示しない」状態（localStorage 永続化）。
 * 毎日使うツールなので、一度理解したモードは自動表示しない。ⓘボタンで再表示可能。
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FeatureId } from '../features/registry'

type ModeIntroStore = {
  dismissed: Partial<Record<FeatureId, boolean>>
  isDismissed: (id: FeatureId) => boolean
  setDismissed: (id: FeatureId, value: boolean) => void
}

export const useModeIntro = create<ModeIntroStore>()(
  persist(
    (set, get) => ({
      dismissed: {},
      isDismissed: (id) => get().dismissed[id] === true,
      setDismissed: (id, value) =>
        set((s) => ({ dismissed: { ...s.dismissed, [id]: value } })),
    }),
    {
      name: 'shogi-mental-board:mode-intro',
      version: 1,
    },
  ),
)
