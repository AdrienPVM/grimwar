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

// Route /map-proto/cloud/:cid — prototype MJ gestion de cartes Firestore
// (CHANTIER D phase 2, tracer D.3). Reste un prototype tant que la feature
// `campaigns/` (S2) n'a pas livré son selector / sa liste. Le cid arrive
// par URL, la campagne stub est créée à l'arrivée si absente.
const MapsCloudScreen = lazy(async () => {
  const mod = await import('@/features/map-proto/maps-cloud-screen');
  return { default: mod.MapsCloudScreen };
});

// Route /map-proto/cloud/:cid/maps/:mid — vue live d'une carte (CHANTIER D
// phase 2, tracer D.4) : tokens persistés via Firestore, drag-and-drop → updateToken.
const MapLiveScreen = lazy(async () => {
  const mod = await import('@/features/map-proto/map-live-screen');
  return { default: mod.MapLiveScreen };
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
        <Route path="/map-proto/cloud/:cid" element={<MapsCloudScreen />} />
        <Route path="/map-proto/cloud/:cid/maps/:mid" element={<MapLiveScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
