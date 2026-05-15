# Design System

The canonical reference is `prototype/grimwar.html`. This document codifies its tokens and patterns for React/Tailwind use.

## Brand voice (visual)

**Cinematic illuminated manuscript.** Dark glass cards float over an animated aurora background. Gold is the dominant accent — Cinzel Decorative for display, hand-tooled SVG flourishes at card corners. Glow, particles, sacred-geometry watermarks. Mobile-first with generous breathing room. Type scales fluidly via `clamp()`.

Reference rooms in this style: AAA RPG HUDs (Baldur's Gate 3, Hades), premium gaming UIs, modern editorial layouts.

## Color tokens

All colors live in `tailwind.config.ts` and are exported from `src/shared/design/tokens.ts`.

### Surfaces

| Token | Hex | Use |
|---|---|---|
| `ink` | `#050309` | absolute base, body bg |
| `bg` | `#08060e` | scroll bg |
| `bg-2` | `#100b18` | elevated bg |
| `bg-3` | `#181122` | hover, sub-surface |
| `bg-elev` | `#221830` | floating cards (rare) |

### Glass

| Token | Value | Use |
|---|---|---|
| `glass` | `rgba(16, 11, 24, 0.82)` | primary glass card bg |
| `glass-2` | `rgba(24, 18, 36, 0.72)` | secondary glass (e.g. emblem fill) |

Always apply with `backdrop-blur-xl backdrop-saturate-150`.

### Gold (the lead accent)

| Token | Hex | Use |
|---|---|---|
| `gold-bright` | `#fde9b4` | highlights, hover glows |
| `gold` | `#d4b25e` | primary accent, large icons |
| `gold-lite` | `#f0d28a` | mid-tone |
| `gold-text` | `#e6c984` | text on glass (~8.5:1) |
| `gold-dim` | `#8a7140` | borders ONLY — never text |
| `gold-deep` | `#5e4d2c` | dark gradient stops |
| `gold-glow` | `rgba(220,184,108,0.45)` | shadows, halos |

### Semantic

| Token | Hex | Use |
|---|---|---|
| `crimson` | `#e85a5a` | damage, low HP, fumble |
| `teal` | `#7ddcc0` | heal, success, crit |
| `amethyst` | `#b5a8f5` | magic, concentration, school of magic |
| `amethyst-deep` | `#7c6cdb` | secondary magic |
| `ruby` | `#ff5c8a` | rare accent |
| `sapphire` | `#5e8eb4` | rare accent |
| `emerald` | `#5dab86` | rare accent |

### Text (WCAG AA on dark glass)

| Token | Hex | Contrast | Use |
|---|---|---|---|
| `text-default` | `#f4ecd6` | ~15:1 | body |
| `text-secondary` | `#d4cbb1` | ~11:1 | secondary prose |
| `text-tertiary` | `#a89e80` | ~6.5:1 | labels, meta, captions |
| `text-faint` | `#8a8068` | ~4.5:1 | decorative only |

**Never** use `gold-dim`, `gold-deep`, `gold-glow` for text. They fail contrast.

### Borders

| Token | Value | Use |
|---|---|---|
| `border-soft` | `rgba(220,184,108,0.2)` | subtle gold borders |
| `border-glow` | `rgba(220,184,108,0.45)` | active borders |
| `border-white` | `rgba(255,255,255,0.08)` | default glass card border |

## Typography

Fonts loaded from Google Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@400;500;600;700;800;900&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
```

| Family | Tailwind | Use |
|---|---|---|
| Cinzel Decorative | `font-display` | hero names, big numbers, illuminated initials |
| Cinzel | `font-title` | uppercase labels, section titles |
| Cormorant Garamond | `font-serif` | prose, body, italic descriptions |
| Inter | `font-ui` | UI controls, body fallback |

### Scale (fluid)

| Token | Class | clamp |
|---|---|---|
| `text-hero` | `text-[clamp(32px,8vw,72px)]` | hero name |
| `text-display-lg` | `text-[clamp(24px,6vw,40px)]` | ability mod, big stats |
| `text-display` | `text-[clamp(20px,5vw,32px)]` | card-level stats |
| `text-body-lg` | `text-[18px]` | hero subtitle |
| `text-body` | `text-[15px]` | default body |
| `text-meta` | `text-[10px]` tracking-wider uppercase | labels |
| `text-micro` | `text-[8px]` tracking-widest uppercase | tiny labels |

## Spacing & sizing

Use Tailwind's default scale plus these custom additions:

| Token | Value | Use |
|---|---|---|
| `radius-card` | `20px` | standard glass card |
| `radius-card-sm` | `14px` | inner cards, items |
| `radius-pill` | `999px` | chips, pills |

## Motion

```css
--t: cubic-bezier(0.22, 0.61, 0.36, 1);          /* default ease */
--t-spring: cubic-bezier(0.34, 1.56, 0.64, 1);   /* bouncy spring */
```

Tailwind:

```ts
transitionTimingFunction: {
  base: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
}
```

Use `ease-base` for normal transitions, `ease-spring` for interactive feedback (hover scale, wedge selection, etc.).

### Duration

- `duration-150` — instant feedback (chip toggle)
- `duration-250` — normal hover, button press
- `duration-350` — card hover, spring open
- `duration-500` — panel transitions, mode switches
- `duration-700` — toast in/out
- `duration-1000+` — ambient (aurora drift, particles)

### Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  .aurora-blob, body::before { animation: none !important; }
}
```

## Core components

### `<GlassPanel>`

The base glass card. All cards extend from this.

```tsx
<GlassPanel className="p-6">
  <h3 className="font-display text-display ...">Title</h3>
  ...
</GlassPanel>
```

Styles applied:
- `bg-glass backdrop-blur-xl backdrop-saturate-150`
- `border border-white/8`
- `rounded-card`
- `shadow-lg` (deep shadow)

### `<Card>`

`<GlassPanel>` with the standard `<CardHeader>` (✦ Title ✦ with optional action button).

### `<Chip>`

Pill-shaped status indicator. Variants: `default`, `magic` (amethyst), `damage` (crimson), `heal` (teal), `inspiration` (gold filled).

### `<Button>`

Variants: `primary` (gold gradient), `secondary` (glass), `ghost` (text-only), `danger` (crimson), `icon` (square).

Sizes: `sm`, `md`, `lg`.

### `<Icon>`

References the SVG sprite. Usage: `<Icon name="i-flame" />`.

The sprite is defined once in `src/shared/design/icons.ts` and rendered via `<svg><use href={`#${name}`} /></svg>`.

Reference icons (must exist):
- Abilities: `i-for`, `i-dex`, `i-con`, `i-int`, `i-sag`, `i-cha`
- Schools: `i-flame`, `i-magic`, `i-shield`, `i-eye`, `i-spell` (sparkle), `i-skull`
- Actions: `i-sword`, `i-bow`, `i-dagger`, `i-staff`
- UI: `i-search`, `i-dice`, `i-book`, `i-heart`, `i-plus`, `i-feather`, `i-potion`, `i-bag`, `i-init`, `i-ac`, `i-speed`

Definitions copied from `prototype/grimwar.html`.

### `<Aurora>`

Animated gradient blobs in `position: fixed` behind everything. Three blobs drifting in 25-35s loops. `pointer-events: none`, `z-index: -2`.

Disable on `prefers-reduced-motion`.

### `<Particles>`

20 floating gold dust motes. CSS-only animation (no JS update loop). `position: fixed`, `pointer-events: none`, `z-index: 1`.

Disable on `prefers-reduced-motion`.

### `<Flourish>`

A decorative SVG ornament. Four placement variants for hero card corners: `tl`, `tr`, `bl`, `br`. The paths are reproduced from `prototype/grimwar.html`.

### `<Divider>`

`✦ ⚜ ✦` between gradient lines. Used in hero, between sections.

## Iconographic shapes

- **Diamond clip-path** for avatars: `polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)`. Used for hero emblem, weapon icons, ally avatars.
- **Hexagonal emblem** for ability score buttons.
- **Sacred geometry** watermarks behind hero and radial menu.

## Layout patterns

### Bento grids

Card-rich screens use asymmetric bento layouts. Standard cards span 1 column, hero cards span 2 columns. Always `grid-template-columns: 1fr 1fr` collapsing to `1fr` at `<= 540px`.

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <Card className="sm:col-span-2">...</Card>  {/* hero */}
  <Card>...</Card>
  <Card>...</Card>
  <Card className="sm:col-span-2">...</Card>
</div>
```

### Hero card

Cinematic card at the top of any screen featuring a character.
- Animated light rays (60s rotation)
- 4 corner flourishes
- Centered diamond emblem with HP-outline + portrait letter
- Huge gradient name in Cinzel Decorative
- Subtitle in italic Cormorant
- ✦ ⚜ ✦ divider
- Class/race/background row
- 4-vital grid (Init, AC, Speed, DC sort)

The hero is its own composite component because the assembly is non-trivial.

## States & feedback

### HP-driven body classes

- `body.hp-low` (<50%): aurora shifts toward crimson
- `body.hp-critical` (<25%): aurora pulses + hero gains heartbeat overlay
- `body.hp-down` (=0): hero desaturated; death-saves modal opens

### Roll feedback

- `screenFlash('crit')`: full-screen gold radial flash + body shake
- `screenFlash('fumble')`: full-screen red radial flash
- `screenFlash('conc-break')`: amethyst flash on concentration break
- `castBurst(x, y)`: particle eruption at coordinates (used when a spell slot is consumed)

### Toasts

`<Toast>` glass panel slides up from bottom-center for 2.4s. Variants: `crit`, `fumble`, `heal`, `damage`, `default`. Used for roll results, HP changes, etc.

## Asset list

Required from designer or generated:
- App icons (PWA): 192, 256, 384, 512 — at minimum
- Favicon
- Apple touch icon
- Open Graph preview image

The visual style for icons: gold emblem on dark, sacred geometry. Adrien can either generate via Nano Banana (per his earlier workflow) or commission once.

## Implementation tips

- Use Tailwind's `arbitrary value` syntax for one-offs: `[grid-column:span_2]`, `[clip-path:polygon(...)]`. Don't add to config unless reused.
- Reuse mixins via Tailwind's `@apply` only in `globals.css` for tightly-coupled patterns (e.g. the SVG sprite's `<svg class="ic">` reset).
- Don't try to recreate the aurora with React state. It's CSS-only animation; keep it that way.
