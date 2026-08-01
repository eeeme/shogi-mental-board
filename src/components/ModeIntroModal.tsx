/**
 * モード説明ポップアップ（ホーム画面上に表示）。短い説明＋実物 ShogiBoard の自動再生デモ。
 * ボタン: 「はじめる」→ モードへ遷移 / 「×」→ 閉じてホームのまま。
 * ※ 将来この位置が課金導線になるため「次回から表示しない」は付けず毎回表示。
 *   モーダル下部に課金CTAを差し込めるスロットを確保しておく（今は空）。
 */
import { ModeDemo } from './ModeDemo'
import { getFeature, type FeatureId } from '../features/registry'

export function ModeIntroModal({
  id,
  onStart,
  onClose,
}: {
  id: FeatureId
  /** 「はじめる」= モードへ遷移。 */
  onStart: () => void
  /** 「×」= 閉じてホームのまま。 */
  onClose: () => void
}) {
  const meta = getFeature(id)

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
          <h2 className="text-lg font-semibold text-sumi-100">
            <span className="tnum mr-2 text-sm text-sumi-500">
              {String(meta.no).padStart(2, '0')}
            </span>
            {meta.title}
          </h2>
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

        {/* 将来の課金CTAスロット（一部モードの買い切りアンロック導線）。今は空。 */}
        <div data-slot="paywall-cta" />

        <button
          type="button"
          onClick={onStart}
          className="mt-4 w-full rounded-lg border border-glow/70 bg-ink-800 px-6 py-3 text-base font-medium text-sumi-100"
        >
          はじめる
        </button>
      </div>
    </div>
  )
}

export default ModeIntroModal
