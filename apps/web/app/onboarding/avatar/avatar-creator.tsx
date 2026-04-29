'use client'

import { useState, useRef, useEffect } from 'react'
import type { AvatarConfig } from '@fridge-manager/shared'
import { buildAvatarUrl, DEFAULT_AVATAR_CONFIG } from '@fridge-manager/shared'
import { updateAvatarConfig } from './actions'

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

export function AvatarCreator() {
  const [config, setConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
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

  const scrollByAmount = (offset: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' })
    }
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await updateAvatarConfig(config)
    } catch (err: unknown) {
      const errorObj = err as Error & { digest?: string };
      if (errorObj?.digest?.startsWith('NEXT_REDIRECT') || errorObj?.message === 'NEXT_REDIRECT') {
        throw err
      }
      setError(errorObj.message || 'Failed to save avatar')
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

  return (
    <div className="flex flex-col w-full h-full min-h-screen pt-12 pb-32">
      {/* Hero Section */}
      <section className="mb-12">
        <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-[var(--color-on-surface)] tracking-tight leading-tight mb-4">
          Create your avatar
        </h1>
        <p className="text-[var(--color-on-secondary-container)] text-lg md:text-xl max-w-md leading-relaxed">
          Personalize your digital chef to reflect your unique flavor in the kitchen.
        </p>
      </section>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start">
        {/* Avatar Preview Column */}
        <div className="w-full lg:w-1/2 lg:sticky lg:top-24 z-10 h-fit">
          <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6">
            <div className="aspect-square w-full rounded-[3rem] bg-[var(--color-surface-container-lowest)] flex items-center justify-center relative overflow-hidden group shadow-[0_40px_80px_rgba(32,97,64,0.05)]">
              <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-primary)]/5 to-transparent"></div>
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <img
                  src={buildAvatarUrl(config)}
                  alt="Avatar preview"
                  className="w-4/5 h-4/5 object-contain transform scale-105 group-hover:scale-110 transition-transform duration-700 relative z-10"
                />
              </div>
            </div>
            
            {/* Randomize Button Below Avatar */}
            <button 
              type="button" 
              onClick={randomize}
              className="flex items-center gap-2 px-8 py-4 bg-white/70 backdrop-blur-xl rounded-full shadow-[0_10px_20px_rgba(0,0,0,0.05)] border border-[var(--color-surface-variant)] hover:scale-105 transition-all active:scale-95 cursor-pointer"
              title="Randomize"
            >
              <span className="material-symbols-outlined text-[var(--color-primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>casino</span>
              <span className="font-label text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">RANDOMIZE AVATAR</span>
            </button>
          </div>
        </div>

        {/* Editor Controls Column */}
        <div className="w-full lg:w-1/2 space-y-8">
          {/* Category Tabs */}
          <div className="sticky top-20 z-40 bg-[var(--color-surface)]/90 backdrop-blur-md -mx-6 px-6 py-4">
            <div className="relative group">
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
          </div>

          {/* Tab Content */}
          <div className="space-y-12 pb-8">
            {activeTab === 'Face' && (
              <>
                <ColorPicker label="Skin Tone" options={SKIN_COLORS} value={config.skinColor} onChange={v => setConfig({ ...config, skinColor: v })} />
                <VariantPicker label="Eyes" icon="visibility" options={EYES_VARIANTS} value={config.eyes} onChange={v => setConfig({ ...config, eyes: v })} />
                <VariantPicker label="Mouth" icon="mood" options={MOUTH_VARIANTS} value={config.mouth} onChange={v => setConfig({ ...config, mouth: v })} />
                <VariantPicker label="Facial Hair" icon="face_retouching_natural" options={BEARD_VARIANTS} value={config.beard} onChange={v => setConfig({ ...config, beard: v })} />
                {config.beard !== 'none' && (
                  <ColorPicker label="Facial Hair Color" options={BEARD_COLORS} value={config.beardColor} onChange={v => setConfig({ ...config, beardColor: v })} />
                )}
              </>
            )}
            {activeTab === 'Hair' && (
              <>
                <VariantPicker label="Hair Style" icon="face_3" options={HAIR_VARIANTS} value={config.hair} onChange={v => setConfig({ ...config, hair: v })} />
                <ColorPicker label="Hair Color" options={HAIR_COLORS} value={config.hairColor} onChange={v => setConfig({ ...config, hairColor: v })} />
              </>
            )}
            {activeTab === 'Clothing' && (
              <>
                <VariantPicker label="Clothing" icon="styler" options={CLOTHING_VARIANTS} value={config.clothing} onChange={v => setConfig({ ...config, clothing: v })} />
                <ColorPicker label="Clothing Color" options={CLOTHING_COLORS} value={config.clothingColor} onChange={v => setConfig({ ...config, clothingColor: v })} />
              </>
            )}
            {activeTab === 'Accessories' && (
              <>
                <VariantPicker label="Glasses" icon="eyeglasses" options={GLASSES_VARIANTS} value={config.glasses} onChange={v => setConfig({ ...config, glasses: v })} />
                <VariantPicker label="Accessories" icon="diamond" options={ACCESSORIES_VARIANTS} value={config.accessories} onChange={v => setConfig({ ...config, accessories: v })} />
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-8 p-4 rounded-md bg-[var(--color-error-container)] text-[var(--color-on-error-container)] text-center font-medium">
          {error}
        </div>
      )}

      {/* Fixed Bottom Action Bar */}
      <footer className="fixed bottom-0 left-0 w-full p-8 bg-[var(--color-surface)]/90 backdrop-blur-md z-40">
        <div className="max-w-screen-xl mx-auto flex justify-end">
          <button 
            onClick={handleSave} 
            disabled={isSubmitting} 
            className="w-full md:w-64 py-5 px-8 cursor-pointer rounded-full forest-gradient text-[var(--color-on-primary)] font-headline font-bold text-lg shadow-[0_12px_24px_rgba(59,122,87,0.3)] hover:-translate-y-0.5 hover:opacity-90 hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Next Step'}
            {!isSubmitting && <span className="material-symbols-outlined">arrow_forward</span>}
          </button>
        </div>
      </footer>

      {/* Global styles for hide scrollbar in this component if needed, though they can be in globals.css */}
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  )
}
