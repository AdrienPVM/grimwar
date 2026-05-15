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
- [ ] 1. In `tailwind.config.ts`, extend the theme with all colors from `docs/DESIGN-SYSTEM.md` (surfaces, glass, gold variants, semantic, text, borders). Add font families, transitionTimingFunctions, borderRadius scale.
- [ ] 2. In `src/shared/design/tokens.ts`, mirror the same tokens as a TS const object — for components that need them outside Tailwind (e.g. SVG fill colors, dynamic styles).
- [ ] 3. In `src/styles/globals.css`, define `:root` CSS variables for every color and motion token (so non-Tailwind contexts like SVG `<stop stop-color="var(--gold)">` work).

### Icon sprite
- [ ] 4. Create `src/shared/design/icons.ts` exporting the SVG sprite as a string constant. Copy every `<symbol>` definition from `prototype/grimwar.html` (i-for, i-dex, i-con, i-int, i-sag, i-cha, i-init, i-ac, i-speed, i-spell, i-sword, i-bow, i-dagger, i-staff, i-flame, i-magic, i-eye, i-book, i-shield, i-potion, i-bag, i-search, i-dice, i-heart, i-plus, i-feather, i-skull).
- [ ] 5. Create `src/shared/components/icon-sprite.tsx`. Renders the hidden sprite once at the top of `<App />`.
- [ ] 6. Create `src/shared/components/icon.tsx` with API: `<Icon name="i-flame" className="w-5 h-5" />`. Internally renders `<svg><use href={`#${name}`} /></svg>`. Use `IconName` as a typed union of all sprite names.

### Atomic components
- [ ] 7. `src/shared/components/glass-panel.tsx` — base glass card. Props: `className`, `children`, `as="div" | "section" | "article"` (default div). Applies bg-glass, backdrop-blur-xl backdrop-saturate-150, border, rounded-card, shadow.
- [ ] 8. `src/shared/components/card.tsx` — extends GlassPanel with standard padding and exports `<Card>`, `<CardHeader>`, `<CardAction>`. Header renders the `✦ Title ✦` decoration.
- [ ] 9. `src/shared/components/button.tsx` — variants `primary | secondary | ghost | danger | icon`, sizes `sm | md | lg`. Use a `cva` (class-variance-authority) pattern OR a manual switch with `clsx` — Adrien's call. Stick to one pattern across the codebase.
- [ ] 10. `src/shared/components/chip.tsx` — pill with variants `default | magic | damage | heal | gold | inspiration` and optional icon. Toggle behavior via `active` prop.
- [ ] 11. `src/shared/components/divider.tsx` — the `✦ ⚜ ✦` divider with gradient lines.
- [ ] 12. `src/shared/components/flourish.tsx` — SVG corner ornament. Props: `position: 'tl' | 'tr' | 'bl' | 'br'`. Renders the same SVG path 4 times with appropriate transforms.

### Ambient effects
- [ ] 13. `src/shared/components/aurora.tsx` — 3 animated gradient blobs in a fixed container. Disabled via `prefers-reduced-motion`. Pure CSS animation, no JS update loop.
- [ ] 14. `src/shared/components/particles.tsx` — 20 floating gold dust motes. Render `<div>` × 20 with randomized `left` and `animation-delay`/`-duration` set inline. CSS handles the float animation.
- [ ] 15. `src/shared/components/sacred-geometry.tsx` — fixed-position SVG watermark. Slow rotation (180s).

### Hero card
- [ ] 16. `src/features/sheet/hero/hero-emblem.tsx` — the diamond emblem with HP outline. Props: `hp: number, hpMax: number, letter: string`. Internally uses the SVG layout from prototype.
- [ ] 17. Defer the full hero card composition to plan 13. Just deliver the emblem here.

### Wire it up
- [ ] 18. Update `src/App.tsx` to mount `<IconSprite />`, `<Aurora />`, `<Particles />` once at the top of the app tree, then a placeholder centered `<HeroEmblem hp={28} hpMax={32} letter="L" />` to verify all visual primitives render.
- [ ] 19. Verify in browser: aurora moves, particles drift, hero emblem renders with HP ring, no console errors.
- [ ] 20. Write minimal Vitest tests:
    - `<Icon name="i-flame" />` renders an `<svg>` with the right `<use href>`
    - `<Chip variant="damage">Test</Chip>` has the damage classes applied
    - `<GlassPanel>` renders children
- [ ] 21. Run checkpoint: `pnpm typecheck && pnpm test && pnpm lint`.
- [ ] 22. Commit: `feat(design-system): atomic components + tokens (plan 02)`.

## Definition of Done

- [ ] All 22 steps checked
- [ ] All atomic components in `src/shared/components/` typed and exported
- [ ] Tailwind theme has every color/motion/typography token from DESIGN-SYSTEM.md
- [ ] Icon sprite reachable via `<Icon>` for all 27 icons
- [ ] `pnpm dev` shows the placeholder with all ambient effects + the hero emblem rendered correctly
- [ ] `pnpm typecheck && pnpm test && pnpm lint` all green
- [ ] No `any` types
- [ ] Tests cover the 3 listed minimum cases

## Notes for next plan

Plan 03 (Firebase) is independent of design system progress — could be done in parallel by another dev. Plans 05+ (wizard) and 13+ (sheet) heavily consume these components.
