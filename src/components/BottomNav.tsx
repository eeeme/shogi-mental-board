/**
 * ボトムナビ（ホーム / 統計 / 設定）。docs/design.md 3章のシンプルな3タブ構成。
 * 日本語ラベルのみ。
 */
export type Tab = 'home' | 'stats' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'ホーム' },
  { id: 'stats', label: '統計' },
  { id: 'settings', label: '設定' },
]

export function BottomNav({
  tab,
  onChange,
}: {
  tab: Tab
  onChange: (t: Tab) => void
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-ink-950/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="メインナビ"
    >
      <div className="mx-auto flex max-w-md">
        {TABS.map(({ id, label }) => {
          const active = id === tab
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex-1 py-3 text-center text-sm transition-colors',
                active ? 'text-sumi-100' : 'text-sumi-500 hover:text-sumi-300',
              ].join(' ')}
            >
              <span className="relative inline-flex flex-col items-center gap-1">
                {label}
                <span
                  className="h-0.5 w-6 rounded-full transition-colors"
                  style={{
                    backgroundColor: active ? 'var(--color-glow)' : 'transparent',
                  }}
                  aria-hidden
                />
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav
