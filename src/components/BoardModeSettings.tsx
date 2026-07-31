/**
 * モードの設定画面に置く「盤の向き」「座標番号ラベル表示」の切替。
 * 値は useModeSettings にモード別で永続化される。
 */
import { useModeSettings, type ModeKey } from '../store/useModeSettings'
import type { BoardOrientation } from '../store/useSettings'

export function BoardModeSettings({ mode }: { mode: ModeKey }) {
  const ui = useModeSettings((s) => s.byMode[mode])
  const setOrientation = useModeSettings((s) => s.setOrientation)
  const setShowLabels = useModeSettings((s) => s.setShowLabels)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-sumi-300">盤の向き</span>
        <div className="flex gap-2">
          {(['sente', 'gote'] as const).map((o: BoardOrientation) => (
            <button
              key={o}
              type="button"
              onClick={() => setOrientation(mode, o)}
              aria-pressed={ui.orientation === o}
              className={[
                'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
                ui.orientation === o
                  ? 'border-glow/70 text-sumi-100'
                  : 'border-line text-sumi-500 hover:text-sumi-300',
              ].join(' ')}
              style={
                ui.orientation === o
                  ? { backgroundColor: 'var(--color-ink-800)' }
                  : undefined
              }
            >
              {o === 'sente' ? '先手視点' : '後手視点'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-sumi-300">座標番号ラベル</span>
        <button
          type="button"
          role="switch"
          aria-checked={ui.showLabels}
          onClick={() => setShowLabels(mode, !ui.showLabels)}
          className={[
            'rounded-md border px-3 py-1.5 text-sm transition-colors',
            ui.showLabels
              ? 'border-glow/70 text-sumi-100'
              : 'border-line text-sumi-500',
          ].join(' ')}
          style={
            ui.showLabels ? { backgroundColor: 'var(--color-ink-800)' } : undefined
          }
        >
          {ui.showLabels ? '表示' : '非表示'}
        </button>
      </div>
    </div>
  )
}

export default BoardModeSettings
