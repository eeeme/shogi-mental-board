/** 機能画面の上部に置く「戻る」バー。任意で説明(ⓘ)ボタンを右端に置ける。 */
export function BackBar({
  title,
  onBack,
  onInfo,
}: {
  title: string
  onBack: () => void
  onInfo?: () => void
}) {
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
      {onInfo && (
        <button
          type="button"
          onClick={onInfo}
          aria-label="このモードの説明"
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-full border border-line text-sm text-sumi-300 transition-colors hover:text-sumi-100"
        >
          ⓘ
        </button>
      )}
    </div>
  )
}

export default BackBar
