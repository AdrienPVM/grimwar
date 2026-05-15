# Plan 02 — Design system implementation

## Goal

Translate the visual language of `prototype/grimwar.html` into reusable React components and a typed Tailwind theme. After this plan, building any feature is a matter of composing `<GlassPanel>`, `<Card>`, `<Button>`, `<Chip>`, `<Icon>`, etc. — no per-component CSS surgery.

## Context

Read:
- `docs/DESIGN-SYSTEM.md` — the full token list and component contracts
- `prototype/grimwar.html` — copy SVG icon sprite definitions and shared CSS verbatim where applicable
- `CLAUDE.md` — coding conventions section

## Prerequisites

Plan 01 complete.

## Steps

### Tokens
- [x] 1. In `tailwind.config.ts`, extend the theme with all colors from `docs/DESIGN-SYSTEM.md` (surfaces, glass, gold variants, semantic, text, borders). Add font families, transitionTimingFunctions, borderRadius scale. _(Pre-scaffold already covered colors / fonts / radii / easings / keyframes. Added the missing fluid `fontSize` scale: `text-hero`, `text-display-lg`, `text-display`, `text-body-lg`, `text-body`, `text-meta`, `text-micro` — each clamp tuned per DESIGN-SYSTEM.md.)_
- [x] 2. In `src/shared/design/tokens.ts`, mirror the same tokens as a TS const object — for components that need them outside Tailwind (e.g. SVG fill colors, dynamic styles). _(Exports `tokens.color/font/radius/ease/duration` with `as const` + `TokenColor`/`TokenFont` helper types. Removed `src/shared/design/.gitkeep`.)_
- [x] 3. In `src/styles/globals.css`, define `:root` CSS variables for every color and motion token (so non-Tailwind contexts like SVG `<stop stop-color="var(--gold)">` work). _(Also moved the `.ic`/`.ic-f` SVG reset out of the prototype into globals so every `<Icon>` inherits it.)_

### Icon sprite
- [x] 4. Create `src/shared/design/icons.ts` exporting the SVG sprite as a string constant. Copy every `<symbol>` definition from `prototype/grimwar.html` (i-for, i-dex, i-con, i-int, i-sag, i-cha, i-init, i-ac, i-speed, i-spell, i-sword, i-bow, i-dagger, i-staff, i-flame, i-magic, i-eye, i-book, i-shield, i-potion, i-bag, i-search, i-dice, i-heart, i-plus, i-feather, i-skull). _(Tactical decision: kept `icons.ts` to the **typed `iconNames` tuple** + `IconName` union; the actual sprite markup lives in `<IconSprite />` as JSX. CLAUDE.md forbids `dangerouslySetInnerHTML`, so a string-constant sprite would have forced the forbidden pattern. Names list stays the single source of truth for typed lookups.)_
- [x] 5. Create `src/shared/components/icon-sprite.tsx`. Renders the hidden sprite once at the top of `<App />`. _(All 27 symbols copied verbatim from prototype lines 1840–1869 into JSX `<symbol>` children. `display:none` keeps it out of layout while `<use>` can still reference it.)_
- [x] 6. Create `src/shared/components/icon.tsx` with API: `<Icon name="i-flame" className="w-5 h-5" />`. Internally renders `<svg><use href={`#${name}`} /></svg>`. Use `IconName` as a typed union of all sprite names. _(Spread `SVGProps<SVGSVGElement>` minus `children` for full forwarding; `.ic` reset applied via `cn()` so caller can still override stroke width / colors.)_

### Atomic components
- [x] 7. `src/shared/components/glass-panel.tsx` — base glass card. Props: `className`, `children`, `as="div" | "section" | "article"` (default div). Applies bg-glass, backdrop-blur-xl backdrop-saturate-150, border, rounded-card, shadow. _(Used `border-white-8` from the existing Tailwind nested color `borderColor.white.8`; `shadow-card` from existing tokens.)_
- [x] 8. `src/shared/components/card.tsx` — extends GlassPanel with standard padding and exports `<Card>`, `<CardHeader>`, `<CardAction>`. Header renders the `✦ Title ✦` decoration. _(`✦` decorations applied via `[&>:first-child]:before/after:content-['✦']` arbitrary variants — keeps the API as `<CardHeader>Title<CardAction>…</CardAction></CardHeader>` without an extra slot prop.)_
- [x] 9. `src/shared/components/button.tsx` — variants `primary | secondary | ghost | danger | icon`, sizes `sm | md | lg`. Use a `cva` (class-variance-authority) pattern OR a manual switch with `clsx` — Adrien's call. Stick to one pattern across the codebase. _(Picked **cva** — declarative, typed, scales to `<Chip>` which uses the same idiom. Added `compoundVariants` so `variant="icon"` with a size gets square padding overrides rather than text-button padding.)_
- [x] 10. `src/shared/components/chip.tsx` — pill with variants `default | magic | damage | heal | gold | inspiration` and optional icon. Toggle behavior via `active` prop. _(Tactical decision: also accepts `onToggle` — when present the chip becomes `role="button"` with full keyboard handling (Enter / Space). Without it stays an inert `<span>`. Saves a wrapping `<button>` for every interactive chip and keeps the inert-decorative case clean.)_
- [x] 11. `src/shared/components/divider.tsx` — the `✦ ⚜ ✦` divider with gradient lines. _(Three flex children: gradient line + glyph + gradient line. `role="presentation"` on the wrapper so SR doesn't announce decorative content.)_
- [x] 12. `src/shared/components/flourish.tsx` — SVG corner ornament. Props: `position: 'tl' | 'tr' | 'bl' | 'br'`. Renders the same SVG path 4 times with appropriate transforms. _(Single SVG, `position` decides absolute coords + a Tailwind transform: `-scale-x-100`/`-scale-y-100`/`-scale-100`. Stroke uses `var(--gold)` so CSS overrides stay possible.)_

### Ambient effects
- [x] 13. `src/shared/components/aurora.tsx` — 3 animated gradient blobs in a fixed container. Disabled via `prefers-reduced-motion`. Pure CSS animation, no JS update loop. _(Pure Tailwind classes; blobs use named colors (`bg-gold`, `bg-amethyst-deep`, `bg-ruby`) + `mix-blend-screen` to match the prototype's filter+blur stack. The global `prefers-reduced-motion` rule in `globals.css` neutralises the keyframes.)_
- [x] 14. `src/shared/components/particles.tsx` — 20 floating gold dust motes. Render `<div>` × 20 with randomized `left` and `animation-delay`/`-duration` set inline. CSS handles the float animation. _(Used `useMemo` to seed the 20 positions once at mount — no JS frame loop, no re-randomisation on re-render. Spans replace divs to keep them inline-only.)_
- [x] 15. `src/shared/components/sacred-geometry.tsx` — fixed-position SVG watermark. Slow rotation (180s). _(SVG drawn directly in JSX with `var(--gold)` stroke. `animate-slowDrift` already aliases the 180s keyframe set up in plan 01.)_

### Hero card
- [x] 16. `src/features/sheet/hero/hero-emblem.tsx` — the diamond emblem with HP outline. Props: `hp: number, hpMax: number, letter: string`. Internally uses the SVG layout from prototype. _(Tactical decision: gradient IDs derived from `useId()` to avoid collisions when multiple `<HeroEmblem>` render on the same page. HP ring uses `481` dasharray (prototype value) with `strokeDashoffset = DIAMOND_PERIMETER * (1 - ratio)`. Below 25% HP → crimson stroke + crimson drop-shadow.)_
- [x] 17. Defer the full hero card composition to plan 13. Just deliver the emblem here.

### Wire it up
- [x] 18. Update `src/App.tsx` to mount `<IconSprite />`, `<Aurora />`, `<Particles />` once at the top of the app tree, then a placeholder centered `<HeroEmblem hp={28} hpMax={32} letter="L" />` to verify all visual primitives render. _(Also mounted `<SacredGeometry />` — it's a one-line composition cost and lets us verify it ships through Tailwind/Vite right now rather than chasing it later.)_
- [x] 19. Verify in browser: aurora moves, particles drift, hero emblem renders with HP ring, no console errors. _(Sandbox here has no headless browser — followed the plan 01 precedent: `pnpm typecheck` clean, `pnpm build` clean (PWA precache 7 entries / 196 KiB), dev server boots and serves `/`, `/src/main.tsx` returns the transformed module. Visual confirmation deferred to Adrien on his workstation; no JSDOM/Playwright surface for animations.)_
- [x] 20. Write minimal Vitest tests:
    - `<Icon name="i-flame" />` renders an `<svg>` with the right `<use href>`
    - `<Chip variant="damage">Test</Chip>` has the damage classes applied
    - `<GlassPanel>` renders children
    _(6 tests in `src/shared/components/__tests__/design-system.test.tsx` — the three required + className forwarding on `<Icon>`, role/tabindex on toggleable `<Chip>`, `as` tag override on `<GlassPanel>`. Added the `cn()` helper in `src/shared/lib/cn.ts` per plan 01 notes before authoring components.)_
- [x] 21. Run checkpoint: `pnpm typecheck && pnpm test && pnpm lint`. _(All three green.)_
- [x] 22. Commit: `feat(design-system): atomic components + tokens (plan 02)`.

## Definition of Done

- [x] All 22 steps checked
- [x] All atomic components in `src/shared/components/` typed and exported (GlassPanel, Card/CardHeader/CardAction, Button, Chip, Divider, Flourish, Aurora, Particles, SacredGeometry, IconSprite, Icon — 11 named exports across 11 files)
- [x] Tailwind theme has every color/motion/typography token from DESIGN-SYSTEM.md
- [x] Icon sprite reachable via `<Icon>` for all 27 icons (typed via `IconName` union)
- [x] `pnpm dev` shows the placeholder with all ambient effects + the hero emblem rendered correctly (dev server boots, modules serve; final on-screen check left to Adrien — no headless browser in this sandbox)
- [x] `pnpm typecheck && pnpm test && pnpm lint` all green
- [x] No `any` types
- [x] Tests cover the 3 listed minimum cases (+ 3 supplementary)

## Notes for next plan

Plan 03 (Firebase) is independent of design system progress — could be done in parallel by another dev. Plans 05+ (wizard) and 13+ (sheet) heavily consume these components.

**Inherited from plan 02:**

- **`cn()` helper at `@/shared/lib/cn.ts`** — use this for ALL conditional className composition. Wraps `clsx` + `tailwind-merge`. Already replaces the need for hand-rolled join helpers.
- **`cva` is the project's variant pattern.** `<Button>` and `<Chip>` both expose `VariantProps<typeof xxxVariants>` and export the `xxxVariants` function. New variant-heavy components (`<Toast>`, `<Tag>`, etc.) should follow the same shape so `compoundVariants` and TS narrowing keep working uniformly.
- **Icon sprite is mounted at `src/shared/components/icon-sprite.tsx`** as JSX `<symbol>`s (not a string constant). To add a new icon: (1) add the `<symbol id="i-xxx">` block, (2) add `'i-xxx'` to `iconNames` in `src/shared/design/icons.ts`. Both lists must stay synchronized — TS doesn't enforce it. **Do not** introduce `dangerouslySetInnerHTML` for new sprite forms (CLAUDE.md forbidden pattern).
- **CSS variables in `:root` are the single source of truth for non-Tailwind contexts** — SVG `<stop stop-color="var(--gold)">`, inline styles, `style={{ filter: 'drop-shadow(0 0 10px var(--gold-glow))' }}`. The Tailwind classes and CSS vars must stay aligned with `src/shared/design/tokens.ts`; if you change a color, update all three.
- **`<GlassPanel>` is the base of every glass surface.** Don't re-derive `bg-glass + backdrop-blur-xl + border border-white-8 + rounded-card` from scratch — compose from `<GlassPanel>` or `<Card>` (which adds the standard padding).
- **`<CardHeader>` decoration is implemented via `[&>:first-child]:before/after:content-['✦']`.** The first child of `<CardHeader>` becomes the styled title; place `<CardAction>` (or anything else) after it. Don't wrap the title in an extra `<span>` — the variant relies on it being the first child element.
- **`<Chip>` doubles as a button when `onToggle` is provided.** No need to wrap a chip in a `<button>` — pass `onToggle` and it gets `role="button"` + keyboard handling. Without `onToggle` it stays a non-interactive `<span>`. Use `active={true}` to add the gold ring (selected state).
- **`<HeroEmblem>` already handles low-HP color shift** (< 25% → crimson stroke). When plan 13 builds the full hero card, just compose `<HeroEmblem>` inside the larger layout; no need to re-implement the HP ring math (`DIAMOND_PERIMETER = 481`).
- **`<Aurora>` + `<Particles>` + `<SacredGeometry>` live in `src/shared/components/`** because they're app-level background layers. Mount them once near the root of any route shell. They're `pointer-events: none` and assigned to the right z-index/blend layer; don't try to nest them inside cards.
- **Tailwind `borderColor.white.8`** generates the class `border-white-8`, not `border-white/8` (the slash syntax is reserved for opacity modifiers on top-level colors). Use `border-white-8` for the default glass card border.
- **Fluid font-size scale**: `text-hero` / `text-display-lg` / `text-display` / `text-body-lg` / `text-body` / `text-meta` / `text-micro` are now Tailwind classes — prefer them over arbitrary `text-[clamp(...)]` values to keep the rhythm consistent.
- **`useId()` for SVG gradient defs**: when a component declares `<linearGradient id="...">`, derive the id from `useId()` (see `<HeroEmblem>`). Multiple instances on the same page collide otherwise — the `#hpGrad` reference would resolve to the first match.
- **No `dangerouslySetInnerHTML` was needed for the sprite** — JSX `<symbol>` works fine. Keep this rule when adding more icon families.
- **Visual verification gap**: plan 02 (and 01) couldn't run a headless browser end-to-end; future plans that ship visual flows should consider adding Playwright snapshot tests (already declared in `package.json`, no test files yet) starting plan 04 or 05 when there's a real interactive flow to capture.
