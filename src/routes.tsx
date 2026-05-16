import { lazy, Suspense, type JSX } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';

import { DebugContent } from '@/features/debug/debug-content';
import { HeroEmblem } from '@/features/sheet/hero/hero-emblem';
import { Splash } from '@/shared/components/splash';

const ManualCharacterScreen = lazy(async () => {
  const mod = await import('@/features/wizard/manual-character-screen');
  return { default: mod.ManualCharacterScreen };
});

/** Stub temporaire — la vraie sheet arrive en plan 06. */
function CharacterPlaceholder(): JSX.Element {
  const params = useParams<{ id: string }>();
  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <HeroEmblem hp={28} hpMax={32} letter={(params.id?.[0] ?? '?').toUpperCase()} />
      <p className="font-serif text-body-sm text-text-tertiary">
        Personnage <code>{params.id}</code> — fiche complète en plan 06.
      </p>
    </main>
  );
}

function Home(): JSX.Element {
  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-24">
      <HeroEmblem hp={28} hpMax={32} letter="L" />
    </main>
  );
}

export function AppRoutes(): JSX.Element {
  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<ManualCharacterScreen />} />
        <Route path="/character/:id" element={<CharacterPlaceholder />} />
        <Route path="/debug-content" element={<DebugContent />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
