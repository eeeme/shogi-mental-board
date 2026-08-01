/**
 * 全体設定画面。話速 / 読みの流派。
 * ※ 盤の向き・番号ラベルは各モードの設定へ移管（ここには置かない）。
 * TTS の動作確認ボタンも置く（ユーザー操作起点なので iOS でも発話可能）。
 */
import { useState } from 'react'
import { useSettings } from '../store/useSettings'
import { tts, isTTSSupported } from '../lib/tts'
import { cellYomi } from '../lib/coords'
import { restorePurchases, PLAY_STORE_URL } from '../lib/purchase'

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-sumi-300">{label}</span>
      <div className="flex gap-2">
        {options.map((opt) => {
          const active = opt.value === value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={[
                'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
                active
                  ? 'border-glow/70 text-sumi-100'
                  : 'border-line text-sumi-500 hover:text-sumi-300',
              ].join(' ')}
              style={active ? { backgroundColor: 'var(--color-ink-800)' } : undefined}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function Settings() {
  const { rate, yomiStyle, setRate, setYomiStyle } = useSettings()
  const supported = isTTSSupported()
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null)

  const onRestore = async () => {
    const outcome = await restorePurchases()
    if (outcome === 'purchased') {
      setRestoreMsg('購入を復元しました。')
    } else {
      setRestoreMsg(
        PLAY_STORE_URL
          ? '復元できる購入が見つかりませんでした。'
          : 'この環境では購入の復元はできません（Google Play 版で有効）。',
      )
    }
  }

  const testSpeak = () => {
    // ユーザー操作起点なので、ここで unlock してから発話する（iOS 対策）
    tts.unlock()
    tts.speak(cellYomi({ file: 2, rank: 5 }, yomiStyle), { rate })
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-sumi-100">設定</h1>
        <p className="text-sm text-sumi-500">端末内に保存されます。</p>
      </header>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-sumi-300">話速</span>
          <span className="tnum text-sm text-sumi-100">{rate.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="w-full accent-[var(--color-glow)]"
          aria-label="話速"
        />
        <div className="tnum flex justify-between text-[10px] text-sumi-500">
          <span>ゆっくり 0.5x</span>
          <span>はやい 2.0x</span>
        </div>
      </div>

      <Segmented
        label="読みの流派"
        value={yomiStyle}
        onChange={setYomiStyle}
        options={[
          { value: 'modern', label: 'よん・なな・きゅう' },
          { value: 'classic', label: 'し・しち・く' },
        ]}
      />

      <p className="text-xs text-sumi-500">
        盤の向き（先手/後手視点）と番号ラベルの表示は、各モードの設定で切り替えます。
      </p>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={testSpeak}
          disabled={!supported}
          className="rounded-md border border-line bg-ink-850 px-4 py-3 text-sm text-sumi-100 transition-colors hover:border-glow/60 disabled:opacity-50"
        >
          音声テスト（「ニーゴー」を読み上げ）
        </button>
        {!supported && (
          <p className="text-xs text-sumi-500">
            この端末/ブラウザは音声読み上げに対応していません。
          </p>
        )}
      </div>

      <section className="flex flex-col gap-2 border-t border-line-soft pt-5">
        <h2 className="text-sm text-sumi-300">購入</h2>
        <button
          type="button"
          onClick={onRestore}
          className="rounded-md border border-line bg-ink-850 px-4 py-3 text-sm text-sumi-100 transition-colors hover:border-glow/60"
        >
          購入を復元
        </button>
        {restoreMsg && (
          <p className="text-xs text-sumi-500">{restoreMsg}</p>
        )}
        <a
          href={`${import.meta.env.BASE_URL}privacy.html`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 text-xs text-sumi-500 underline"
        >
          プライバシーポリシー
        </a>
      </section>
    </div>
  )
}

export default Settings
