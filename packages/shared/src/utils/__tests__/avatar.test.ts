import { describe, it, expect } from 'vitest'
import { buildAvatarUrl, DEFAULT_AVATAR_CONFIG } from '../avatar'
import type { AvatarConfig } from '../../types/avatar'

describe('buildAvatarUrl', () => {
  it('returns a URL with default config when null is provided', () => {
    const url = buildAvatarUrl(null)
    const urlObj = new URL(url)
    
    expect(urlObj.origin).toBe('https://api.dicebear.com')
    expect(urlObj.pathname).toBe('/9.x/pixel-art/svg')
    
    const params = urlObj.searchParams
    expect(params.get('seed')).toBe(DEFAULT_AVATAR_CONFIG.seed)
    expect(params.get('backgroundColor')).toBe('transparent')
    expect(params.get('skinColor')).toBe(DEFAULT_AVATAR_CONFIG.skinColor)
    expect(params.get('hair')).toBe(DEFAULT_AVATAR_CONFIG.hair)
    expect(params.get('clothing')).toBe(DEFAULT_AVATAR_CONFIG.clothing)
    // Optional/none ones shouldn't be included by default, but wait, default has mouth
    expect(params.get('mouth')).toBe(DEFAULT_AVATAR_CONFIG.mouth)
    expect(params.get('beard')).toBeNull() // default is 'none'
  })

  it('includes specific properties when provided in config', () => {
    const config: AvatarConfig = {
      seed: 'custom-seed',
      skinColor: 'ff0000',
      hair: 'short02',
      hairColor: '00ff00',
      clothing: 'variant02',
      clothingColor: '0000ff',
      accessories: 'glasses01',
      accessoriesColor: 'ffffff',
      beard: 'beard01',
      beardColor: '111111',
      eyes: 'variant02',
      eyebrows: 'variant02',
      mouth: 'sad01',
      glasses: 'variant02',
      glassesColor: '222222',
    }
    
    const url = buildAvatarUrl(config)
    const params = new URL(url).searchParams
    
    expect(params.get('seed')).toBe('custom-seed')
    expect(params.get('skinColor')).toBe('ff0000')
    expect(params.get('hair')).toBe('short02')
    expect(params.get('hairColor')).toBe('00ff00')
    expect(params.get('clothing')).toBe('variant02')
    expect(params.get('clothingColor')).toBe('0000ff')
    expect(params.get('accessories')).toBe('glasses01')
    expect(params.get('accessoriesProbability')).toBe('100')
    expect(params.get('accessoriesColor')).toBe('ffffff')
    expect(params.get('beard')).toBe('beard01')
    expect(params.get('beardProbability')).toBe('100')
    expect(params.get('beardColor')).toBe('111111')
    expect(params.get('eyes')).toBe('variant02')
    expect(params.get('eyebrows')).toBe('variant02')
    expect(params.get('mouth')).toBe('sad01')
    expect(params.get('glasses')).toBe('variant02')
    expect(params.get('glassesProbability')).toBe('100')
    expect(params.get('glassesColor')).toBe('222222')
  })

  it('excludes properties set to "none"', () => {
    const config = {
      seed: 'test',
      skinColor: 'f9c9b6',
      hair: 'none',
      clothing: 'none',
      accessories: 'none',
      beard: 'none',
      eyes: 'none',
      eyebrows: 'none',
      mouth: 'none',
      glasses: 'none',
    } as AvatarConfig

    const url = buildAvatarUrl(config)
    const params = new URL(url).searchParams
    
    expect(params.get('seed')).toBe('test')
    expect(params.has('hair')).toBe(false)
    expect(params.has('clothing')).toBe(false)
    expect(params.has('accessories')).toBe(false)
    expect(params.has('beard')).toBe(false)
    expect(params.has('eyes')).toBe(false)
    expect(params.has('eyebrows')).toBe(false)
    expect(params.has('mouth')).toBe(false)
    expect(params.has('glasses')).toBe(false)
  })
})
