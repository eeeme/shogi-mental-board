/**
 * 符号読み変換 + speechSynthesis ラッパー。
 *
 * 方針（CLAUDE.md / docs/design.md）:
 * - コンポーネントから直接 window.speechSynthesis を触らない。必ずこのラッパー経由。
 * - TTS には符号をそのまま渡さず、coords の読み仮名に変換して渡す。
 * - iOS Safari 対策: 音声はユーザー操作を起点にしないと再生されない。
 *   最初のユーザー操作（開始ボタン）で unlock() を呼ぶゲートを設ける。
 * - 話速指定と、連続発話のキュー管理（1件ずつ順に再生）を担う。
 */
import { cellYomi, type Cell, type YomiStyle } from './coords'

export type SpeakOptions = {
  /** 話速。SpeechSynthesisUtterance.rate（0.1〜10、既定 1）。 */
  rate?: number
  /** 言語。既定 'ja-JP'。 */
  lang?: string
}

export type SpeakItem = {
  /** 実際に発話するテキスト（読み仮名）。 */
  text: string
}

/** この環境で Web Speech API（発話）が使えるか。 */
export function isTTSSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  )
}

/** マスを発話用の読み仮名（カタカナ）へ変換する（例: 7六 → "ナナロク"）。 */
export function cellToSpeech(cell: Cell, style: YomiStyle = 'modern'): string {
  return cellYomi(cell, style)
}

function clampRate(rate: number | undefined): number {
  if (rate == null || Number.isNaN(rate)) return 1
  return Math.min(10, Math.max(0.1, rate))
}

/**
 * speechSynthesis のラッパー。発話は 1 件ずつ順に処理し、
 * speak() は該当の発話が終わった（or 中断された）時点で解決する Promise を返す。
 */
class Tts {
  private unlocked = false

  /** 対応状況。 */
  get supported(): boolean {
    return isTTSSupported()
  }

  /** unlock 済みか（iOS ゲート）。 */
  get isUnlocked(): boolean {
    return this.unlocked
  }

  /**
   * iOS 対策のアンロック。**必ずユーザー操作（クリック/タップ）のハンドラ内で呼ぶ。**
   * 無音の短い発話を 1 度流して、以降のプログラム発話を許可させる。
   */
  unlock(): void {
    if (!this.supported) return
    try {
      // 念のため保留中をクリアしてから無音を流す
      window.speechSynthesis.resume()
      const u = new SpeechSynthesisUtterance('')
      u.volume = 0
      window.speechSynthesis.speak(u)
      this.unlocked = true
    } catch {
      // 失敗しても致命的ではない（後続の speak で再試行される）
    }
  }

  /**
   * テキストを 1 件発話する。完了/中断で解決。
   * 既に発話中の場合は speechSynthesis のキューに積まれ、順に再生される。
   */
  speak(text: string, opts: SpeakOptions = {}): Promise<void> {
    if (!this.supported) return Promise.resolve()
    return new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = opts.lang ?? 'ja-JP'
      u.rate = clampRate(opts.rate)
      let settled = false
      const done = () => {
        if (settled) return
        settled = true
        resolve()
      }
      u.onend = done
      u.onerror = done
      window.speechSynthesis.speak(u)
    })
  }

  /** マスを読み仮名に変換して発話する。 */
  speakCell(
    cell: Cell,
    style: YomiStyle = 'modern',
    opts: SpeakOptions = {},
  ): Promise<void> {
    return this.speak(cellToSpeech(cell, style), opts)
  }

  /** 進行中・保留中の発話をすべて中断する。 */
  cancel(): void {
    if (!this.supported) return
    try {
      window.speechSynthesis.cancel()
    } catch {
      // noop
    }
  }
}

/** アプリ全体で共有する TTS インスタンス。 */
export const tts = new Tts()

/** 指定ミリ秒だけ待つ（発話間隔などに使用）。中断可能な AbortSignal に対応。 */
export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const id = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(id)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
