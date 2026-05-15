import { Aurora } from '@/shared/components/aurora';
import { IconSprite } from '@/shared/components/icon-sprite';
import { Particles } from '@/shared/components/particles';
import { SacredGeometry } from '@/shared/components/sacred-geometry';
import { HeroEmblem } from '@/features/sheet/hero/hero-emblem';

/**
 * Placeholder de plan 02 : monte le sprite + les effets ambiants + un <HeroEmblem>
 * de test pour valider toutes les primitives visuelles. Sera remplacé en plan 03+
 * par la vraie coquille de routes.
 */
export function App(): JSX.Element {
  return (
    <>
      <IconSprite />
      <Aurora />
      <SacredGeometry />
      <Particles />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-24">
        <HeroEmblem hp={28} hpMax={32} letter="L" />
      </main>
    </>
  );
}
