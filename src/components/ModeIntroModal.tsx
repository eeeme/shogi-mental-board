/**
 * モード説明ポップアップ（ホーム画面上に表示）。短い説明＋実物 ShogiBoard の自動再生デモ。
 * ボタン: 「はじめる」→ モードへ遷移 / 「×」→ 閉じてホームのまま。
 * ※ 将来この位置が課金導線になるため「次回から表示しない」は付けず毎回表示。
 *   モーダル下部に課金CTAを差し込めるスロットを確保しておく（今は空）。
 */
import { ModeDemo } from './ModeDemo'
import { getFeature, type FeatureId } from '../features/registry'
import { useUsageGate } from '../lib/entitlement'
import { FREE_DAILY_LIMIT } from '../lib/usage'

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
  const gate = useUsageGate(id)
  // 無料枠を使い切った対象モードで、Pro でなければ課金CTAを見せる（今はブロックしない）。
  const showPaywallCta = !gate.isPro && gate.limited

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

        {/* 課金CTAスロット（一部モードの買い切りアンロック導線）。
            今は判定を通すだけで、実際のブロックはしない（「はじめる」も有効）。 */}
        <div data-slot="paywall-cta">
          {showPaywallCta && (
            <div className="mt-4 rounded-lg border border-line-soft bg-ink-950/50 p-3">
              <p className="text-xs text-sumi-300">
                今日の無料回数（{FREE_DAILY_LIMIT}回）を使い切りました。
              </p>
              <button
                type="button"
                disabled
                className="mt-2 w-full rounded-md border border-line px-4 py-2 text-sm text-sumi-500"
              >
                アンロック（準備中）
              </button>
            </div>
          )}
        </div>

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
