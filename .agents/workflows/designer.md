---
description: Use Stitch MCP to design and iterate on UI screens. Use before implementing frontend components to establish visual direction.
---

# UI Designer

## Before starting
1. Read `docs/architecture.md` — focus on Navigation, Avatar Creator, and UI Design sections
2. Read `docs/competitive-analysis.md` — understand what patterns work from competitors
3. Read the Stitch skills in `.agents/skills/` for proper prompting technique

## Stitch Skills (read these before generating)

| Skill | Path | When to use |
|---|---|---|
| **stitch-design** | `.agents/skills/stitch-design/SKILL.md` | Every time — prompt enhancement pipeline, design system synthesis, workflow routing |
| **taste-design** | `.agents/skills/taste-design/SKILL.md` | First screen — anti-generic design rules, color calibration, typography architecture |
| **stitch-loop** | `.agents/skills/stitch-loop/SKILL.md` | Multi-page generation — baton-passing pattern for iterating through screens |
| **design-md** | `.agents/skills/design-md/SKILL.md` | After first screen — extract design system from generated screen into `.stitch/DESIGN.md` |
| **react-components** | `.agents/skills/react-components/SKILL.md` | Design-to-code — convert Stitch HTML to modular React components with AST validation |
| **shadcn-ui** | `.agents/skills/shadcn-ui/SKILL.md` | Web implementation — component discovery, theming, dark mode, design tokens for Next.js |

### Supporting references
- `.agents/skills/stitch-design/references/design-mappings.md` — translate vague terms to UI/UX keywords
- `.agents/skills/stitch-design/references/prompt-keywords.md` — component vocabulary and adjective palettes
- `.agents/skills/stitch-design/examples/` — example DESIGN.md, enhanced prompts, metadata.json
- `.agents/skills/shadcn-ui/resources/customization-guide.md` — CSS variables, cva variants, design tokens
- `.agents/skills/react-components/resources/architecture-checklist.md` — quality gate for Stitch→React conversion

## Design system
- **Mobile:** React Native Paper (Material Design 3) — follows Android conventions
- **Web:** shadcn/ui + Tailwind CSS — clean, accessible components
- **Shared colors:**
  - 🟢 Fresh: items with >3 days until expiration
  - 🟡 Use soon: items with 1-3 days until expiration
  - 🔴 Expired: items past expiration date
  - Neutral: items without expiration (household category)

## Screens to design (using Stitch MCP)

### Priority 1: Core screens
1. **Grocery List** — category-grouped, real-time sync indicators, check-off animations
2. **Inventory View** — location tabs (fridge/freezer/pantry), color-coded expiration, "X days ago" badges
3. **Item Detail Sheet** — bottom drawer with item info, edit, discard actions

### Priority 2: Flows
4. **Discard Flow** — "Used it" / "Tossed it" prompt with restock suggestion
5. **Recently Removed** — activity feed with avatars and undo
6. **Add Item** — quick-add with category picker and destination selector

### Priority 3: Settings & onboarding
7. **Onboarding** — signup → display name → avatar creator → household setup
8. **Settings** — profile, avatar editor, household management, notifications, analytics
9. **Analytics** — "At a Glance" tab (text stats) + "Charts" tab (Victory charts)

## Stitch workflow (Phase 0)
1. Create a Stitch project → save `projectId` to `.stitch/metadata.json`
2. Use `taste-design` to define the aesthetic → generate `.stitch/DESIGN.md`
3. Use `stitch-design` prompt enhancement for each screen prompt
4. Generate screens one at a time with `generate_screen_from_text`, starting with Priority 1
5. After each screen, download HTML + screenshot to `.stitch/designs/`
6. Use `stitch-loop` baton pattern for iterating through remaining screens
7. Iterate based on feedback using `edit_screens`

## Design principles (from competitive analysis)
- **AnyList pattern:** Category-grouped grocery lists with collapsible sections
- **NoWaste pattern:** Color-coded expiration with FEFO sorting
- **Simplicity:** Maximum 2 taps for any common action
- **Mobile-first:** Design for phone screen, adapt to web
- **Personal:** Avatars visible throughout the app ("Added by [avatar] Emilia")

## Taste constraints (from taste-design)
- No generic AI aesthetics (no neon purple, no Inter font, no pure black)
- Single accent color, saturation < 80%
- Spring physics for micro-interactions
- Touch targets minimum 44px
- Mobile-first responsive collapse
