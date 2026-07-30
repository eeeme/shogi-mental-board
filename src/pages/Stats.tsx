/**
 * 統計画面（機能⑥）。記録が溜まる Phase 4 で実装予定。
 * ここでは方針だけ示すプレースホルダ。
 */
export function Stats() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-sumi-100">統計</h1>
        <p className="text-sm text-sumi-500">上達を数字で。</p>
      </header>
      <div className="rounded-lg border border-line-soft bg-ink-900/60 p-6 text-center">
        <p className="text-sm text-sumi-300">準備中</p>
        <p className="mt-1 text-xs text-sumi-500">
          正答率・平均反応時間・日別推移・連続日数を表示予定。
        </p>
      </div>
    </div>
  )
}

export default Stats
