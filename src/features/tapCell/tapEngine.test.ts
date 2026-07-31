import { describe, it, expect } from 'vitest'
import {
  judgeTap,
  nextQuestion,
  tapChannelsValid,
  toggleTapChannel,
  type TapChannels,
} from './tapEngine'
import { isInRange } from '../../lib/range'

describe('符号/音声チャンネル（両方オフ不可）', () => {
  it('tapChannelsValid', () => {
    expect(tapChannelsValid({ symbol: true, audio: false })).toBe(true)
    expect(tapChannelsValid({ symbol: false, audio: true })).toBe(true)
    expect(tapChannelsValid({ symbol: false, audio: false })).toBe(false)
  })

  it('両方onから一方を消せる', () => {
    const both: TapChannels = { symbol: true, audio: true }
    expect(toggleTapChannel(both, 'audio')).toEqual({ symbol: true, audio: false })
  })

  it('最後の1つは消せない（元の状態を返す）', () => {
    const onlySymbol: TapChannels = { symbol: true, audio: false }
    expect(toggleTapChannel(onlySymbol, 'symbol')).toEqual(onlySymbol)
    const onlyAudio: TapChannels = { symbol: false, audio: true }
    expect(toggleTapChannel(onlyAudio, 'audio')).toEqual(onlyAudio)
  })
})

describe('judgeTap', () => {
  it('一致で正解、不一致で不正解', () => {
    expect(judgeTap({ file: 7, rank: 6 }, { file: 7, rank: 6 })).toBe(true)
    expect(judgeTap({ file: 7, rank: 6 }, { file: 6, rank: 7 })).toBe(false)
  })
})

describe('nextQuestion', () => {
  it('範囲内のマスを返す', () => {
    const range = { fileMin: 4, fileMax: 6, rankMin: 4, rankMax: 6 }
    for (let i = 0; i < 200; i++) {
      expect(isInRange(nextQuestion(range), range)).toBe(true)
    }
  })
})
