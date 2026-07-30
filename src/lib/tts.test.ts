import { describe, it, expect } from 'vitest'
import { cellToSpeech, delay, isTTSSupported, tts } from './tts'

describe('cellToSpeech', () => {
  it('マスを読み仮名へ変換する', () => {
    expect(cellToSpeech({ file: 7, rank: 6 }, 'modern')).toBe('ななろく')
    expect(cellToSpeech({ file: 7, rank: 6 }, 'classic')).toBe('しちろく')
  })
})

describe('TTS ラッパー（非対応環境での安全性）', () => {
  it('jsdom では speechSynthesis 非対応として扱う', () => {
    expect(isTTSSupported()).toBe(false)
    expect(tts.supported).toBe(false)
  })

  it('非対応環境でも speak は解決し、例外を投げない', async () => {
    await expect(tts.speak('ななろく')).resolves.toBeUndefined()
    await expect(tts.speakCell({ file: 1, rank: 1 })).resolves.toBeUndefined()
    expect(() => tts.cancel()).not.toThrow()
    expect(() => tts.unlock()).not.toThrow()
  })
})

describe('delay', () => {
  it('指定時間後に解決する', async () => {
    const start = Date.now()
    await delay(20)
    expect(Date.now() - start).toBeGreaterThanOrEqual(10)
  })

  it('AbortSignal で中断すると reject する', async () => {
    const ac = new AbortController()
    const p = delay(1000, ac.signal)
    ac.abort()
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
  })
})
