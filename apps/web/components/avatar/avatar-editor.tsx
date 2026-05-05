'use client'

/**
 * Shared avatar editor component.
 *
 * Extracted from the onboarding AvatarCreator so both the onboarding
 * flow and the settings/profile page can reuse it.
 */
import { useState, useRef, useEffect } from 'react'
import type { AvatarConfig } from '@fridge-manager/shared'
import { buildAvatarUrl, DEFAULT_AVATAR_CONFIG } from '@fridge-manager/shared'

const SKIN_COLORS = ['f9c9b6', 'f8d25c', 'ffdfbf', 'c0aede', 'd1d4f9', 'ffd5dc']
const HAIR_COLORS = ['000000', '4a3123', 'a56b46', 'e8b877', 'b55239', 'e2e2e2']
const CLOTHING_COLORS = ['1e1e1e', '00b159', '5bc0de', '44c585', '428bca', 'ae0001', 'ffc425', 'transparent']
const BEARD_COLORS = HAIR_COLORS

const HAIR_VARIANTS = ['none', 'short01', 'short02', 'short03', 'short04', 'short05', 'long01', 'long02', 'long03', 'long04', 'long05']
const CLOTHING_VARIANTS = ['variant01', 'variant02', 'variant03', 'variant04', 'variant05']
const BEARD_VARIANTS = ['none', 'variant01', 'variant02', 'variant03', 'variant04', 'variant05']
const EYES_VARIANTS = ['variant01', 'variant02', 'variant03', 'variant04', 'variant05']
const MOUTH_VARIANTS = ['happy01', 'happy02', 'happy03', 'sad01', 'sad02']
const GLASSES_VARIANTS = ['none', 'dark01', 'dark02', 'light01', 'light02']
const ACCESSORIES_VARIANTS = ['none', 'variant01', 'variant02', 'variant03']

const ColorPicker = ({ label, options, value, onChange }: { label: string, options: string[], value: string, onChange: (v: string) => void }) => (
  <div className="space-y-4">
    <h3 className="font-headline text-xl font-bold text-[var(--color-on-surface)]">{label}</h3>
    <div className="flex flex-wrap gap-4">
      {options.map(color => {
        const isSelected = value === color;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`w-12 h-12 rounded-full cursor-pointer transition-transform active:scale-90 ${isSelected ? 'ring-4 ring-offset-4 ring-[var(--color-primary)] scale-110 shadow-lg' : 'hover:scale-110 shadow-sm border border-[var(--color-surface-variant)]'}`}
            style={{ backgroundColor: color === 'transparent' ? 'var(--color-surface-container-high)' : `#${color}` }}
            title={`#${color}`}
          />
        )
      })}
    </div>
  </div>
)

const VariantPicker = ({ label, options, value, onChange, icon }: { label: string, options: string[], value: string, onChange: (v: string) => void, icon?: string }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-end">
      <h3 className="font-headline text-xl font-bold text-[var(--color-on-surface)]">{label}</h3>
      <span className="text-[var(--color-on-secondary-container)] font-label text-sm">{options.length} options</span>
    </div>
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
      {options.map((opt, i) => {
        const isSelected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`aspect-square rounded-2xl p-2 transition-all cursor-pointer ring-inset flex flex-col items-center justify-center gap-2 group ${isSelected ? 'bg-[var(--color-primary)]/10 ring-2 ring-[var(--color-primary)] shadow-inner' : 'bg-white shadow-[0_15px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] ring-0 hover:ring-2 ring-[var(--color-primary)]'}`}
          >
            {icon && <span className={`material-symbols-outlined text-3xl transition-colors ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-primary)]'}`} style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}>{icon}</span>}
            <span className={`font-label text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface-variant)]'}`}>
              {opt === 'none' ? 'None' : `${i}`}
            </span>
          </button>
        )
      })}
    </div>
  </div>
)

interface AvatarEditorProps {
  /** Initial config — if provided, starts with these values (edit mode) */
  initialConfig?: AvatarConfig
  /** Called whenever the config changes */
  onChange: (config: AvatarConfig) => void
}

export function AvatarEditor({ initialConfig, onChange }: AvatarEditorProps) {
  const [config, setConfig] = useState<AvatarConfig>(initialConfig ?? DEFAULT_AVATAR_CONFIG)

  const TABS = ['Face', 'Hair', 'Clothing', 'Accessories'] as const
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Face')

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [])

  // Sync changes upward
  const updateConfig = (updates: Partial<AvatarConfig>) => {
    const newConfig = { ...config, ...updates }
    setConfig(newConfig)
    onChange(newConfig)
  }

  const scrollByAmount = (offset: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' })
    }
  }

  const randomize = () => {
    const newConfig = {
      ...config,
      seed: Math.random().toString(36).substring(7),
      skinColor: SKIN_COLORS[Math.floor(Math.random() * SKIN_COLORS.length)],
      hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
      clothingColor: CLOTHING_COLORS[Math.floor(Math.random() * CLOTHING_COLORS.length)],
    }
    setConfig(newConfig)
    onChange(newConfig)
  }

  return (
    <div className="flex flex-col w-full">
      {/* Avatar Preview */}
      <div className="w-full flex flex-col items-center mb-6">
        <div className="w-32 h-32 rounded-[2rem] bg-[var(--color-surface-container-low)] flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-primary)]/5 to-transparent" />
          <img
            src={buildAvatarUrl(config)}
            alt="Avatar preview"
            className="w-4/5 h-4/5 object-contain relative z-10"
          />
        </div>
      </div>

      {/* Category Tabs with Scroll Arrows */}
      <div className="relative group mb-6">
        {/* Left Scroll Indicator/Button */}
        <div className={`absolute top-0 left-0 h-full w-12 bg-gradient-to-r from-[var(--color-surface)] to-transparent pointer-events-none flex items-center justify-start z-10 transition-opacity duration-300 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}>
          <button
            type="button"
            disabled={!canScrollLeft}
            onClick={() => scrollByAmount(-150)}
            className="pointer-events-auto h-8 w-8 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.1)] flex items-center justify-center -ml-2 hover:bg-stone-50 cursor-pointer text-[var(--color-on-surface)] transition-all active:scale-95 disabled:opacity-50"
            aria-label="Scroll left"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
        </div>

        {/* Scroll Container */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide px-2"
        >
          {TABS.map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-none px-6 py-3 rounded-full font-label text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${activeTab === tab ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20' : 'bg-white text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] shadow-sm'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Right Scroll Indicator/Button */}
        <div className={`absolute top-0 right-0 h-full w-12 bg-gradient-to-l from-[var(--color-surface)] to-transparent pointer-events-none flex items-center justify-end z-10 transition-opacity duration-300 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}>
          <button
            type="button"
            disabled={!canScrollRight}
            onClick={() => scrollByAmount(150)}
            className="pointer-events-auto h-8 w-8 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.1)] flex items-center justify-center -mr-2 hover:bg-stone-50 cursor-pointer text-[var(--color-on-surface)] transition-all active:scale-95 disabled:opacity-50"
            aria-label="Scroll right"
          >
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-12 pb-4">
        {activeTab === 'Face' && (
          <>
            <ColorPicker label="Skin Tone" options={SKIN_COLORS} value={config.skinColor} onChange={v => updateConfig({ skinColor: v })} />
            <VariantPicker label="Eyes" icon="visibility" options={EYES_VARIANTS} value={config.eyes} onChange={v => updateConfig({ eyes: v })} />
            <VariantPicker label="Mouth" icon="mood" options={MOUTH_VARIANTS} value={config.mouth} onChange={v => updateConfig({ mouth: v })} />
            <VariantPicker label="Facial Hair" icon="face_retouching_natural" options={BEARD_VARIANTS} value={config.beard} onChange={v => updateConfig({ beard: v })} />
            {config.beard !== 'none' && (
              <ColorPicker label="Facial Hair Color" options={BEARD_COLORS} value={config.beardColor} onChange={v => updateConfig({ beardColor: v })} />
            )}
          </>
        )}
        {activeTab === 'Hair' && (
          <>
            <VariantPicker label="Hair Style" icon="face_3" options={HAIR_VARIANTS} value={config.hair} onChange={v => updateConfig({ hair: v })} />
            <ColorPicker label="Hair Color" options={HAIR_COLORS} value={config.hairColor} onChange={v => updateConfig({ hairColor: v })} />
          </>
        )}
        {activeTab === 'Clothing' && (
          <>
            <VariantPicker label="Clothing" icon="styler" options={CLOTHING_VARIANTS} value={config.clothing} onChange={v => updateConfig({ clothing: v })} />
            <ColorPicker label="Clothing Color" options={CLOTHING_COLORS} value={config.clothingColor} onChange={v => updateConfig({ clothingColor: v })} />
          </>
        )}
        {activeTab === 'Accessories' && (
          <>
            <VariantPicker label="Glasses" icon="eyeglasses" options={GLASSES_VARIANTS} value={config.glasses} onChange={v => updateConfig({ glasses: v })} />
            <VariantPicker label="Accessories" icon="diamond" options={ACCESSORIES_VARIANTS} value={config.accessories} onChange={v => updateConfig({ accessories: v })} />
          </>
        )}
      </div>

      {/* Randomize Button */}
      <button
        type="button"
        onClick={randomize}
        className="flex items-center justify-center gap-2 px-8 py-4 bg-white/70 backdrop-blur-xl rounded-full shadow-[0_10px_20px_rgba(0,0,0,0.05)] border border-[var(--color-surface-variant)] hover:scale-105 transition-all active:scale-95 cursor-pointer mt-4 mx-auto"
        title="Randomize"
      >
        <span className="material-symbols-outlined text-[var(--color-primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>casino</span>
        <span className="font-label text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">RANDOMIZE</span>
      </button>
    </div>
  )
}
