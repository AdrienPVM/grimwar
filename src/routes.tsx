import { lazy, Suspense, type JSX } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { DebugContent } from '@/features/debug/debug-content';
import { Splash } from '@/shared/components/splash';

const LibraryScreen = lazy(async () => {
  const mod = await import('@/features/library/library-screen');
  return { default: mod.LibraryScreen };
});

const WizardScreen = lazy(async () => {
  const mod = await import('@/features/wizard/wizard-screen');
  return { default: mod.WizardScreen };
});

const SheetScreen = lazy(async () => {
  const mod = await import('@/features/sheet/sheet-screen');
  return { default: mod.SheetScreen };
});

// Route /map-proto — squelette de prototype carte (PAS production).
// Cf. plans/MAP-MODE-PROPOSAL.md. Pas listée au menu, accessible par URL.
const MapProtoScreen = lazy(async () => {
  const mod = await import('@/features/map-proto/map-proto-screen');
  return { default: mod.MapProtoScreen };
});

export function AppRoutes(): JSX.Element {
  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        <Route path="/" element={<LibraryScreen />} />
        <Route path="/create" element={<WizardScreen />} />
        <Route path="/character/:id" element={<SheetScreen />} />
        <Route path="/debug-content" element={<DebugContent />} />
        <Route path="/map-proto" element={<MapProtoScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
