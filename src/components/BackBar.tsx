/** 機能画面の上部に置く「戻る」バー。 */
export function BackBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="rounded-md border border-line px-3 py-1.5 text-sm text-sumi-300 transition-colors hover:text-sumi-100"
      >
        ← 戻る
      </button>
      <h1 className="text-lg font-semibold text-sumi-100">{title}</h1>
    </div>
  )
}

export default BackBar
