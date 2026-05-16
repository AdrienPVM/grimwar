import type { JSX } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider } from '@/features/auth/auth-provider';
import { HitMissGateModal } from '@/features/dice/hit-miss-gate-modal';
import { PhysicalRollModal } from '@/features/dice/physical-roll-modal';
import { useAuth } from '@/features/auth/use-auth';
import { AppRoutes } from '@/routes';
import { Aurora } from '@/shared/components/aurora';
import { IconSprite } from '@/shared/components/icon-sprite';
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
      <PhysicalRollModal />
      <HitMissGateModal />
      <ToastHost />
    </AuthProvider>
  );
}

function AppShell(): JSX.Element {
  const { isReady } = useAuth();
  if (!isReady) return <Splash />;
  return <AppRoutes />;
}
