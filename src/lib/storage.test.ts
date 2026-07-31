import 'fake-indexeddb/auto'
import { beforeEach, describe, it, expect } from 'vitest'
import {
  clearAllSessions,
  getAllSessions,
  getSessionsByMode,
  saveSession,
  type Session,
} from './storage'
import { SessionRecorder } from './sessionRecorder'

function makeSession(over: Partial<Session> = {}): Session {
  return {
    id: over.id ?? 'id-' + Math.random(),
    mode: over.mode ?? 'tap',
    startedAt: over.startedAt ?? 1000,
    finishedAt: over.finishedAt ?? 2000,
    trials: over.trials ?? [
      { prompt: '7六', answer: '7六', correct: true, ms: 800 },
    ],
  }
}

describe('storage (IndexedDB)', () => {
  beforeEach(async () => {
    await clearAllSessions()
  })

  it('保存して取得できる（startedAt 昇順）', async () => {
    await saveSession(makeSession({ id: 'b', startedAt: 200 }))
    await saveSession(makeSession({ id: 'a', startedAt: 100 }))
    const all = await getAllSessions()
    expect(all.map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('同一 id は上書きされる', async () => {
    await saveSession(makeSession({ id: 'x', startedAt: 1 }))
    await saveSession(makeSession({ id: 'x', startedAt: 5 }))
    const all = await getAllSessions()
    expect(all).toHaveLength(1)
    expect(all[0].startedAt).toBe(5)
  })

  it('モードで絞り込める', async () => {
    await saveSession(makeSession({ id: '1', mode: 'tap' }))
    await saveSession(makeSession({ id: '2', mode: 'reverse' }))
    await saveSession(makeSession({ id: '3', mode: 'sequence' }))
    expect((await getSessionsByMode('reverse')).map((s) => s.id)).toEqual(['2'])
  })
})

describe('SessionRecorder', () => {
  beforeEach(async () => {
    await clearAllSessions()
  })

  it('試行を記録し finish で保存する', async () => {
    const rec = new SessionRecorder('tap', 1000)
    rec.record({ prompt: '7六', answer: '7六', correct: true, ms: 500 })
    rec.record({ prompt: '3四', answer: '3三', correct: false, ms: 900 })
    expect(rec.count).toBe(2)
    expect(rec.correctCount).toBe(1)

    const saved = await rec.finish(3000)
    expect(saved).not.toBeNull()
    expect(saved?.mode).toBe('tap')
    expect(saved?.finishedAt).toBe(3000)

    const all = await getAllSessions()
    expect(all).toHaveLength(1)
    expect(all[0].trials).toHaveLength(2)
  })

  it('試行 0 件なら保存しない', async () => {
    const rec = new SessionRecorder('sequence')
    expect(await rec.finish()).toBeNull()
    expect(await getAllSessions()).toHaveLength(0)
  })

  it('finish は多重呼び出しで二重保存しない', async () => {
    const rec = new SessionRecorder('reverse')
    rec.record({ prompt: '5五', answer: '5五', correct: true, ms: 300 })
    await rec.finish()
    expect(await rec.finish()).toBeNull()
    expect(await getAllSessions()).toHaveLength(1)
  })
})
