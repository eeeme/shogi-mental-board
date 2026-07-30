/**
 * ホーム画面。機能カードの一覧（7機能）。
 * 未実装は disabled 表示。available な機能だけ onOpen で開く。
 */
import { FEATURES, type FeatureId, type FeatureMeta } from '../features/registry'

type HomeProps = {
  onOpen: (id: FeatureId) => void
}

function FeatureCard({
  feature,
  onOpen,
}: {
  feature: FeatureMeta
  onOpen: (id: FeatureId) => void
}) {
  const available = feature.status === 'available'
  return (
    <button
      type="button"
      disabled={!available}
      onClick={available ? () => onOpen(feature.id) : undefined}
      className={[
        'group flex w-full flex-col gap-1 rounded-lg border p-4 text-left transition-colors',
        available
          ? 'border-line bg-ink-850 hover:border-glow/60 hover:bg-ink-800'
          : 'cursor-not-allowed border-line-soft bg-ink-900/60 opacity-55',
      ].join(' ')}
      aria-disabled={!available}
    >
      <div className="flex items-center gap-2">
        <span className="tnum text-xs text-sumi-500">
          {String(feature.no).padStart(2, '0')}
        </span>
        <span className="text-base font-medium text-sumi-100">
          {feature.title}
        </span>
        {available ? (
          <span
            className="ml-auto h-2 w-2 rounded-full"
            style={{ backgroundColor: 'var(--color-glow)' }}
            aria-hidden
          />
        ) : (
          <span className="ml-auto rounded-full border border-line-soft px-2 py-0.5 text-[10px] text-sumi-500">
            準備中
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-sumi-300">{feature.summary}</p>
    </button>
  )
}

export function Home({ onOpen }: HomeProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-6">
      <header className="flex flex-col gap-1">
        <p className="tnum text-xs tracking-widest text-sumi-500">脳内盤</p>
        <h1 className="text-xl font-semibold text-sumi-100">今日の鍛錬</h1>
        <p className="text-sm text-sumi-500">
          見えない盤を、記憶で。1タップで始める。
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} onOpen={onOpen} />
        ))}
      </div>
    </div>
  )
}

export default Home
