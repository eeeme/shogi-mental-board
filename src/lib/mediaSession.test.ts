import { describe, it, expect } from 'vitest'
import {
  clearMediaSession,
  isMediaSessionSupported,
  setPlaybackState,
  setupMediaSession,
} from './mediaSession'

describe('mediaSession ラッパー（非対応環境での安全性）', () => {
  it('jsdom では MediaSession 非対応として扱う', () => {
    expect(isMediaSessionSupported()).toBe(false)
  })

  it('非対応環境でも各APIは例外を投げない（no-op）', () => {
    expect(() =>
      setupMediaSession({ title: 't', onStop: () => {} }),
    ).not.toThrow()
    expect(() => setPlaybackState('playing')).not.toThrow()
    expect(() => clearMediaSession()).not.toThrow()
  })
})
