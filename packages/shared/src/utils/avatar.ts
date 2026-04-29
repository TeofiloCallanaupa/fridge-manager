import type { AvatarConfig } from '../types/avatar'

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  seed: 'fridge-manager',
  skinColor: 'f9c9b6',
  hair: 'short01',
  hairColor: '000000',
  accessories: 'none',
  accessoriesColor: '000000',
  clothing: 'variant01',
  clothingColor: '1e1e1e',
  beard: 'none',
  beardColor: '000000',
  eyes: 'variant01',
  eyebrows: 'none',
  mouth: 'happy01',
  glasses: 'none',
  glassesColor: '000000',
}

/**
 * Builds a DiceBear Pixel Art SVG URL from an AvatarConfig.
 * Note: Arrays/multiple items are comma-separated in the URL.
 * We enforce string properties for colors to be hex without the `#`.
 */
export function buildAvatarUrl(config: AvatarConfig | null): string {
  const c = config || DEFAULT_AVATAR_CONFIG
  
  const params = new URLSearchParams({
    seed: c.seed,
    backgroundColor: 'transparent',
  })

  if (c.skinColor) params.append('skinColor', c.skinColor)
  
  if (c.hair && c.hair !== 'none') {
    params.append('hair', c.hair)
    if (c.hairColor) params.append('hairColor', c.hairColor)
  }
  
  if (c.accessories && c.accessories !== 'none') {
    params.append('accessories', c.accessories)
    params.append('accessoriesProbability', '100')
    if (c.accessoriesColor) params.append('accessoriesColor', c.accessoriesColor)
  }
  
  if (c.clothing && c.clothing !== 'none') {
    params.append('clothing', c.clothing)
    if (c.clothingColor) params.append('clothingColor', c.clothingColor)
  }

  if (c.beard && c.beard !== 'none') {
    params.append('beard', c.beard)
    params.append('beardProbability', '100')
    if (c.beardColor) params.append('beardColor', c.beardColor)
  }

  if (c.eyes && c.eyes !== 'none') params.append('eyes', c.eyes)
  if (c.eyebrows && c.eyebrows !== 'none') params.append('eyebrows', c.eyebrows)
  if (c.mouth && c.mouth !== 'none') params.append('mouth', c.mouth)
  
  if (c.glasses && c.glasses !== 'none') {
    params.append('glasses', c.glasses)
    params.append('glassesProbability', '100')
    if (c.glassesColor) params.append('glassesColor', c.glassesColor)
  }

  return `https://api.dicebear.com/9.x/pixel-art/svg?${params.toString()}`
}
