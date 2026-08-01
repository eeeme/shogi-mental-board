/**
 * モード説明ポップアップ（ホーム画面上に表示）。短い説明＋実物 ShogiBoard の自動再生デモ。
 * ボタン: 「はじめる」→ モードへ遷移 / 「×」→ 閉じてホームのまま。
 * ロックされた（有料・未購入）モードは、内容は見せつつ「はじめる」の代わりに購入導線を出す。
 */
import { useState } from 'react'
import { ModeDemo } from './ModeDemo'
import { getFeature, type FeatureId } from '../features/registry'
import { useFeatureLock } from '../lib/entitlement'
import { purchaseUnlock, PLAY_STORE_URL } from '../lib/purchase'

const PURCHASE_COPY = [
  '00〜02の機能は、これからもずっと無料で、回数制限もありません。まずはそれだけで十分に練習できると思います。',
  'もし気に入って開発を応援してもよいと思っていただけたら、購入をご検討ください。購入すると系列記憶モードとバックグラウンド再生が使えるようになります。',
  'いただいた分は今後の機能追加の費用に充てます。詰将棋モードと盤面記憶モードを準備中で、完成したら追加料金なしでお使いいただけます。',
]

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
  const { locked } = useFeatureLock(id)
  const [purchaseMsg, setPurchaseMsg] = useState<string | null>(null)

  const onPurchase = async () => {
    const outcome = await purchaseUnlock()
    if (outcome === 'purchased') {
      onStart()
    } else {
      // Web/PWA には購入手段がない。Google Play 版へ誘導する。
      setPurchaseMsg(
        PLAY_STORE_URL
          ? 'Google Play 版で購入できます。'
          : 'Google Play 版で解除できます（現在準備中）。',
      )
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${meta.title} の説明`}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-line bg-ink-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-sumi-100">
            <span className="tnum mr-2 text-sm text-sumi-500">
              {String(meta.no).padStart(2, '0')}
            </span>
            {meta.title}
            {locked && (
              <span className="ml-2 rounded-full border border-line-soft px-2 py-0.5 text-[10px] text-sumi-500">
                ロック
              </span>
            )}
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

        {/* 課金CTAスロット：ロック時のみ購入導線を出す */}
        <div data-slot="paywall-cta">
          {locked ? (
            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-line-soft bg-ink-950/40 p-4">
              <div className="flex flex-col gap-2 text-xs leading-relaxed text-sumi-300">
                {PURCHASE_COPY.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              <button
                type="button"
                onClick={onPurchase}
                className="w-full rounded-lg border border-glow/70 bg-ink-800 px-6 py-3 text-base font-medium text-sumi-100"
              >
                購入して解除
              </button>
              {purchaseMsg && (
                <p className="text-center text-xs text-sumi-500">{purchaseMsg}</p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onStart}
              className="mt-4 w-full rounded-lg border border-glow/70 bg-ink-800 px-6 py-3 text-base font-medium text-sumi-100"
            >
              はじめる
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ModeIntroModal
