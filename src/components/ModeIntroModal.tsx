/**
 * モード説明モーダル。短い説明文＋実物 ShogiBoard の自動再生デモ。
 * 「次回から表示しない」を localStorage に永続化。ⓘボタンからも再表示できる。
 */
import { ModeDemo } from './ModeDemo'
import { getFeature, type FeatureId } from '../features/registry'
import { useModeIntro } from '../store/useModeIntro'

export function ModeIntroModal({
  id,
  onClose,
}: {
  id: FeatureId
  onClose: () => void
}) {
  const meta = getFeature(id)
  const dismissed = useModeIntro((s) => s.dismissed[id] === true)
  const setDismissed = useModeIntro((s) => s.setDismissed)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${meta.title} の説明`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-line bg-ink-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-sumi-100">{meta.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="rounded-md border border-line px-2 py-1 text-sm text-sumi-300"
          >
            ✕
          </button>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-sumi-300">
          {meta.howto ?? meta.summary}
        </p>

        <div className="mt-4 rounded-lg border border-line-soft bg-ink-950/50 p-4">
          <ModeDemo id={id} />
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-sumi-300">
          <input
            type="checkbox"
            checked={dismissed}
            onChange={(e) => setDismissed(id, e.target.checked)}
            className="h-4 w-4 accent-[var(--color-glow)]"
          />
          次回から表示しない
        </label>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-glow/70 bg-ink-800 px-6 py-3 text-base font-medium text-sumi-100"
        >
          はじめる
        </button>
      </div>
    </div>
  )
}

export default ModeIntroModal
