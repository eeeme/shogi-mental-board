/**
 * SessionRecorder: 1 試行ごとに記録を溜め、終了時に IndexedDB へ保存する。
 * ①②③（および将来の④⑤）で共通利用する。
 */
import { saveSession, type Mode, type Session, type Trial } from './storage'

function genId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export class SessionRecorder {
  readonly id: string
  readonly mode: Mode
  readonly startedAt: number
  private trials: Trial[] = []
  private finished = false

  constructor(mode: Mode, now: number = Date.now()) {
    this.id = genId()
    this.mode = mode
    this.startedAt = now
  }

  /** 1 試行を記録する。 */
  record(trial: Trial): void {
    this.trials.push(trial)
  }

  /** これまでの試行数。 */
  get count(): number {
    return this.trials.length
  }

  /** 正答数。 */
  get correctCount(): number {
    return this.trials.filter((t) => t.correct).length
  }

  /** 現時点の Session スナップショット（保存はしない）。 */
  snapshot(finishedAt: number = Date.now()): Session {
    return {
      id: this.id,
      mode: this.mode,
      startedAt: this.startedAt,
      finishedAt,
      trials: [...this.trials],
    }
  }

  /**
   * セッションを確定して IndexedDB に保存する。
   * 試行が 0 件なら保存せず null を返す。多重呼び出しは無視。
   */
  async finish(now: number = Date.now()): Promise<Session | null> {
    if (this.finished) return null
    this.finished = true
    if (this.trials.length === 0) return null
    const session = this.snapshot(now)
    await saveSession(session)
    return session
  }
}
