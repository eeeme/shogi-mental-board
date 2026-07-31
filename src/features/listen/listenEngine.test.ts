import { describe, it, expect } from 'vitest'
import { runListenLoop } from './listenEngine'
import type { Cell } from '../../lib/coords'

const CELL: Cell = { file: 1, rank: 1 }

function abortableGap(signal: AbortSignal): Promise<void> {
  return signal.aborted
    ? Promise.reject(new DOMException('Aborted', 'AbortError'))
    : Promise.resolve()
}

describe('runListenLoop（⑧ 継続/停止）', () => {
  it('停止されるまで継続し、停止で終わる', async () => {
    const ac = new AbortController()
    let spoken = 0
    const count = await runListenLoop({
      pickCell: () => CELL,
      speakCell: async () => {
        spoken += 1
        if (spoken >= 5) ac.abort() // 5回読み上げたら停止
      },
      waitGap: abortableGap,
      signal: ac.signal,
      onCell: undefined,
    })
    expect(spoken).toBe(5)
    expect(count).toBe(5)
    expect(ac.signal.aborted).toBe(true)
  })

  it('最初から停止済みなら一度も読み上げない', async () => {
    const ac = new AbortController()
    ac.abort()
    let spoken = 0
    const count = await runListenLoop({
      pickCell: () => CELL,
      speakCell: async () => {
        spoken += 1
      },
      waitGap: abortableGap,
      signal: ac.signal,
    })
    expect(spoken).toBe(0)
    expect(count).toBe(0)
  })

  it('onCell に読み上げ対象を通知する', async () => {
    const ac = new AbortController()
    const seen: Cell[] = []
    let spoken = 0
    await runListenLoop({
      pickCell: () => ({ file: 7, rank: 6 }),
      speakCell: async () => {
        spoken += 1
        if (spoken >= 2) ac.abort()
      },
      waitGap: abortableGap,
      signal: ac.signal,
      onCell: (c) => seen.push(c),
    })
    expect(seen).toEqual([
      { file: 7, rank: 6 },
      { file: 7, rank: 6 },
    ])
  })
})
