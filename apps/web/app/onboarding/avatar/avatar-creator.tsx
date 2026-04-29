'use client'

import { useState } from 'react'
import type { AvatarConfig } from '@fridge-manager/shared'
import { buildAvatarUrl, DEFAULT_AVATAR_CONFIG } from '@fridge-manager/shared'
import { updateAvatarConfig } from './actions'

const SKIN_COLORS = ['f9c9b6', 'f8d25c', 'ffdfbf', 'c0aede', 'd1d4f9', 'ffd5dc']
const HAIR_COLORS = ['000000', '4a3123', 'a56b46', 'e8b877', 'b55239', 'e2e2e2']
const CLOTHING_COLORS = ['1e1e1e', '00b159', '5bc0de', '44c585', '428bca', 'ae0001', 'ffc425', 'transparent']
const BEARD_COLORS = HAIR_COLORS

// Simplify by offering a curated subset of Pixel Art variants
const HAIR_VARIANTS = ['none', 'short01', 'short02', 'short03', 'short04', 'short05', 'long01', 'long02', 'long03', 'long04', 'long05']
const CLOTHING_VARIANTS = ['variant01', 'variant02', 'variant03', 'variant04', 'variant05']
const BEARD_VARIANTS = ['none', 'variant01', 'variant02', 'variant03', 'variant04', 'variant05']
const EYES_VARIANTS = ['variant01', 'variant02', 'variant03', 'variant04', 'variant05']
const MOUTH_VARIANTS = ['happy01', 'happy02', 'happy03', 'sad01', 'sad02']
const GLASSES_VARIANTS = ['none', 'dark01', 'dark02', 'light01', 'light02']
const ACCESSORIES_VARIANTS = ['none', 'variant01', 'variant02', 'variant03']

export function AvatarCreator() {
  const [config, setConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await updateAvatarConfig(config)
    } catch (err: any) {
      setError(err.message || 'Failed to save avatar')
      setIsSubmitting(false)
    }
  }

  const randomize = () => {
    setConfig({
      ...config,
      seed: Math.random().toString(36).substring(7),
      skinColor: SKIN_COLORS[Math.floor(Math.random() * SKIN_COLORS.length)],
      hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
      clothingColor: CLOTHING_COLORS[Math.floor(Math.random() * CLOTHING_COLORS.length)],
    })
  }

  const ColorPicker = ({ label, options, value, onChange }: { label: string, options: string[], value: string, onChange: (v: string) => void }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(color => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className={`h-8 w-8 rounded-full border-2 transition-all ${value === color ? 'border-zinc-900 dark:border-zinc-100 scale-110' : 'border-transparent'}`}
            style={{ backgroundColor: color === 'transparent' ? '#f4f4f5' : `#${color}` }}
            title={`#${color}`}
          />
        ))}
      </div>
    </div>
  )

  const VariantPicker = ({ label, options, value, onChange }: { label: string, options: string[], value: string, onChange: (v: string) => void }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3 py-1 text-sm rounded-full border ${value === opt ? 'bg-zinc-900 text-white dark:bg-white dark:text-black border-transparent' : 'bg-transparent border-zinc-200 dark:border-zinc-800'}`}
          >
            {opt.replace('variant', 'Style ').replace('short', 'Short ').replace('long', 'Long ').replace('dark', 'Dark ').replace('light', 'Light ')}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col space-y-8">
      <div className="flex justify-center text-sm font-medium text-zinc-500">
        Step 2 of 3
      </div>

      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Create your avatar</h2>
        <p className="text-sm text-zinc-500">
          Customize your pixel art character
        </p>
      </div>

      {/* Live Preview */}
      <div className="flex flex-col items-center gap-4">
        <div className="h-32 w-32 overflow-hidden rounded-full bg-zinc-100 shadow-inner dark:bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={buildAvatarUrl(config)}
            alt="Avatar preview"
            className="h-full w-full object-cover"
          />
        </div>
        <button type="button" className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-transparent hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 h-9 px-3" onClick={randomize}>
          Randomize Colors
        </button>
      </div>

      {/* Editor Controls */}
      <div className="h-[300px] overflow-y-auto pr-4 space-y-6 scrollbar-thin">
        <ColorPicker label="Skin Tone" options={SKIN_COLORS} value={config.skinColor} onChange={v => setConfig({ ...config, skinColor: v })} />
        <ColorPicker label="Hair Color" options={HAIR_COLORS} value={config.hairColor} onChange={v => setConfig({ ...config, hairColor: v })} />
        <VariantPicker label="Hair Style" options={HAIR_VARIANTS} value={config.hair} onChange={v => setConfig({ ...config, hair: v })} />
        <VariantPicker label="Eyes" options={EYES_VARIANTS} value={config.eyes} onChange={v => setConfig({ ...config, eyes: v })} />
        <VariantPicker label="Mouth" options={MOUTH_VARIANTS} value={config.mouth} onChange={v => setConfig({ ...config, mouth: v })} />
        <VariantPicker label="Facial Hair" options={BEARD_VARIANTS} value={config.beard} onChange={v => setConfig({ ...config, beard: v })} />
        {config.beard !== 'none' && (
          <ColorPicker label="Facial Hair Color" options={BEARD_COLORS} value={config.beardColor} onChange={v => setConfig({ ...config, beardColor: v })} />
        )}
        <VariantPicker label="Glasses" options={GLASSES_VARIANTS} value={config.glasses} onChange={v => setConfig({ ...config, glasses: v })} />
        <VariantPicker label="Accessories" options={ACCESSORIES_VARIANTS} value={config.accessories} onChange={v => setConfig({ ...config, accessories: v })} />
        <VariantPicker label="Clothing" options={CLOTHING_VARIANTS} value={config.clothing} onChange={v => setConfig({ ...config, clothing: v })} />
        <ColorPicker label="Clothing Color" options={CLOTHING_COLORS} value={config.clothingColor} onChange={v => setConfig({ ...config, clothingColor: v })} />
      </div>

      {error && (
        <div className="text-sm text-red-500 text-center">
          {error}
        </div>
      )}

      <button onClick={handleSave} disabled={isSubmitting} className="w-full h-10 px-4 py-2 bg-zinc-900 text-zinc-50 hover:bg-zinc-900/90 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/90 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed">
        {isSubmitting ? 'Saving...' : 'Continue'}
      </button>
    </div>
  )
}
