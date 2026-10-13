/**
 * Android アプリ版の読み上げ（アプリ内で作ったネイティブプラグイン "NativeSpeech"）。
 * - speak / stop: 画面表示中の1回読み上げ。WebView の speechSynthesis は端末によって鳴らないため、
 *   アプリ版ではすべてこちらを使う。
 * - startLoop / stopLoop: 00「ただ読み上げ」のバックグラウンド連続読み上げ（有料）。
 *   フォアグラウンドサービスで動くので、画面を消しても他のアプリを使っていても続く。
 *
 * ブラウザ版（GitHub Pages）では使わない。呼び出し側は isNative で分岐する。
 */
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

export type LoopItem = { text: string; file: number; rank: number }
export type LoopCellEvent = { file: number; rank: number; count: number }
/** user=停止ボタン（画面 or 通知） / tts_unavailable=読み上げエンジンが使えない / その他=OS都合 */
export type LoopStoppedEvent = { reason: string }

interface NativeSpeechPlugin {
  isAvailable(): Promise<{ available: boolean }>
  speak(opts: { text: string; rate: number }): Promise<{ completed: boolean }>
  stop(): Promise<void>
  startLoop(opts: { items: LoopItem[]; intervalMs: number; rate: number }): Promise<void>
  stopLoop(): Promise<void>
  isLooping(): Promise<{ looping: boolean }>
  addListener(event: 'loopCell', fn: (e: LoopCellEvent) => void): Promise<PluginListenerHandle>
  addListener(event: 'loopStopped', fn: (e: LoopStoppedEvent) => void): Promise<PluginListenerHandle>
}

/** Android/iOS アプリとして動いているか（ブラウザ版なら false）。 */
export const isNative = Capacitor.isNativePlatform()

export const NativeSpeech = registerPlugin<NativeSpeechPlugin>('NativeSpeech')
