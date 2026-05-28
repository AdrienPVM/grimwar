import type { JSX } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider } from '@/features/auth/auth-provider';
import { HitMissGateModal } from '@/features/dice/hit-miss-gate-modal';
import { PhysicalRollModal } from '@/features/dice/physical-roll-modal';
import { useAuth } from '@/features/auth/use-auth';
import { AppRoutes } from '@/routes';
import { Aurora } from '@/shared/components/aurora';
import { IconSprite } from '@/shared/components/icon-sprite';
import { NavShell } from '@/shared/components/nav-shell';
import { OfflineBanner } from '@/shared/components/offline-banner';
import { Particles } from '@/shared/components/particles';
import { SacredGeometry } from '@/shared/components/sacred-geometry';
import { Splash } from '@/shared/components/splash';
import { ToastHost } from '@/shared/components/toast-host';

/**
 * Coquille app : monte le sprite + l'ambiance + l'AuthProvider + le router.
 * Le splash occupe l'écran tant que Firebase n'a pas résolu l'état initial
 * (premier onAuthStateChanged).
 */
export function App(): JSX.Element {
  return (
    <AuthProvider>
      <IconSprite />
      <Aurora />
      <SacredGeometry />
      <Particles />
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
      {/* PhysicalRollModal et HitMissGateModal sont singletons globaux —
          rendus hors du Routes pour rester montés au switch de route. */}
      <PhysicalRollModal />
      <HitMissGateModal />
      <ToastHost />
      {/* Bannière offline globale (jalon 1D). Rendue après le ToastHost pour
          être au-dessus dans le DOM, et au-dessus de tout via z-[120]. */}
      <OfflineBanner />
    </AuthProvider>
  );
}

function AppShell(): JSX.Element {
  const { isReady } = useAuth();
  if (!isReady) return <Splash />;
  return (
    <>
      <NavShell />
      <AppRoutes />
    </>
  );
}
