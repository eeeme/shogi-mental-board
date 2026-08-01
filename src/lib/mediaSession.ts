/**
 * MediaSession API の薄いラッパー（機能検出つき）。
 * 00モードのバックグラウンド再生（事前生成音声 + <audio>）でロック画面に
 * 再生コントロールを出すために使う。詳細は docs/spike-background-audio.md。
 *
 * ※ 現状はスパイク用の土台。実際の <audio> 再生ループと結線して使う。
 */

export function isMediaSessionSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'mediaSession' in navigator &&
    typeof (navigator as Navigator).mediaSession !== 'undefined'
  )
}

export type MediaSessionHandlers = {
  title?: string
  onPlay?: () => void
  onPause?: () => void
  onStop?: () => void
}

/** ロック画面のメタデータとアクションハンドラを設定する。非対応環境では no-op。 */
export function setupMediaSession(handlers: MediaSessionHandlers): void {
  if (!isMediaSessionSupported()) return
  const ms = navigator.mediaSession
  try {
    if (handlers.title && typeof MediaMetadata !== 'undefined') {
      ms.metadata = new MediaMetadata({ title: handlers.title })
    }
    ms.setActionHandler('play', handlers.onPlay ?? null)
    ms.setActionHandler('pause', handlers.onPause ?? null)
    ms.setActionHandler('stop', handlers.onStop ?? null)
  } catch {
    // 一部アクション未対応でも致命的ではない
  }
}

/** 再生状態をロック画面に同期する。 */
export function setPlaybackState(state: 'none' | 'playing' | 'paused'): void {
  if (!isMediaSessionSupported()) return
  try {
    navigator.mediaSession.playbackState = state
  } catch {
    // noop
  }
}

/** ハンドラ・メタデータを解除する。 */
export function clearMediaSession(): void {
  if (!isMediaSessionSupported()) return
  const ms = navigator.mediaSession
  try {
    ms.metadata = null
    for (const a of ['play', 'pause', 'stop'] as const) {
      ms.setActionHandler(a, null)
    }
    ms.playbackState = 'none'
  } catch {
    // noop
  }
}
