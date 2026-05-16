import { lazy, Suspense, type JSX } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { DebugContent } from '@/features/debug/debug-content';
import { HeroEmblem } from '@/features/sheet/hero/hero-emblem';
import { Splash } from '@/shared/components/splash';

const ManualCharacterScreen = lazy(async () => {
  const mod = await import('@/features/wizard/manual-character-screen');
  return { default: mod.ManualCharacterScreen };
});

const SheetScreen = lazy(async () => {
  const mod = await import('@/features/sheet/sheet-screen');
  return { default: mod.SheetScreen };
});

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
        <Route path="/character/:id" element={<SheetScreen />} />
        <Route path="/debug-content" element={<DebugContent />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
