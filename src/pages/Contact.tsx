/**
 * 問い合わせタブ。Googleフォームへの導線（不具合報告・要望）＋ 支援（投げ銭）。
 * ※ 統計・支援はモードカードには置かない（タブに集約）。
 */
import { CONTACT_FORM_URL, SUPPORT_URL } from '../config'

export function Contact() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-sumi-100">問い合わせ</h1>
        <p className="text-sm text-sumi-500">不具合報告・要望・支援。</p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-sumi-300">不具合報告・要望</h2>
        {CONTACT_FORM_URL ? (
          <a
            href={CONTACT_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-line bg-ink-850 px-4 py-3 text-center text-sm text-sumi-100 transition-colors hover:border-glow/60"
          >
            フォームを開く（別タブ）
          </a>
        ) : (
          <div className="rounded-md border border-line-soft bg-ink-900/60 p-4 text-center">
            <p className="text-sm text-sumi-300">準備中</p>
            <p className="mt-1 text-xs text-sumi-500">
              Google フォームのURLが決まり次第ここに導線を置きます。
            </p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-sumi-300">開発を応援する</h2>
        {SUPPORT_URL ? (
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-line bg-ink-850 px-4 py-3 text-center text-sm text-sumi-100 transition-colors hover:border-glow/60"
          >
            このアプリを支援する
          </a>
        ) : (
          <div className="rounded-md border border-line-soft bg-ink-900/60 p-4 text-center">
            <p className="text-sm text-sumi-300">準備中</p>
            <p className="mt-1 text-xs text-sumi-500">
              開発を応援いただける導線を将来ここに置きます。
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

export default Contact
