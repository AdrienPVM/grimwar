import { useEffect, useRef, type JSX, type ReactNode } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';

import { AuthProvider } from '@/features/auth/auth-provider';
import { CampaignNotifications } from '@/features/campaigns/campaign-notifications';
import { HitMissGateModal } from '@/features/dice/hit-miss-gate-modal';
import { PhysicalRollModal } from '@/features/dice/physical-roll-modal';
import { SpellSigilOverlay } from '@/features/dice/spell-sigil-overlay';
import { useAuth } from '@/features/auth/use-auth';
import { AppRoutes } from '@/routes';
import { Aurora } from '@/shared/components/aurora';
import { BottomNav } from '@/shared/components/bottom-nav';
import { IconSprite } from '@/shared/components/icon-sprite';
import { NavShell } from '@/shared/components/nav-shell';
import { OfflineBanner } from '@/shared/components/offline-banner';
import { Particles } from '@/shared/components/particles';
import { SacredGeometry } from '@/shared/components/sacred-geometry';
import { Splash } from '@/shared/components/splash';
import { useRouteMotion } from '@/shared/hooks/use-route-motion';
import { DiceTrayOverlay } from '@/features/dice/dice-tray-overlay';
import { ToastHost } from '@/shared/components/toast-host';
import {
  BOTTOM_NAV_SPACER_CLASS,
  shouldShowBottomNav,
} from '@/shared/lib/bottom-nav-visibility';
import { useLocaleStore } from '@/shared/lib/slices/locale-slice';

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
      {/* Sceaux de sort (plan 38) — singleton décoratif, au-dessus de la fiche
          mais sous les modales de saisie et les toasts. */}
      <SpellSigilOverlay />
      {/* Plateau de dés 3D — sous le toast dans le DOM pour rester derrière lui
          en cas de recouvrement : le résultat chiffré prime sur la mise en scène. */}
      <DiceTrayOverlay />
      <ToastHost />
      {/* Bannière offline globale (jalon 1D). Rendue après le ToastHost pour
          être au-dessus dans le DOM, et au-dessus de tout via z-[120]. */}
      <OfflineBanner />
    </AuthProvider>
  );
}

/**
 * Réserve la hauteur de la barre basse sous le contenu — et UNIQUEMENT sur les
 * écrans où elle est rendue. Sans cela, le dernier bouton d'une liste (« Créer
 * une campagne », le dernier objet d'un inventaire) se retrouve sous le verre
 * de la barre : visible, mais intappable.
 *
 * Posé ici plutôt que dans `<PageContainer>` pour deux raisons : la gouttière
 * dépend de la ROUTE, pas de la page (le conteneur est rendu hors routeur dans
 * ses propres tests), et tous les écrans ne passent pas par le conteneur — la
 * fiche monte son `<main>` à la main.
 *
 * Un `<div>` nu sans `overflow` : il ne devient pas conteneur de défilement, donc
 * les barres épinglées (`position: sticky`) gardent la fenêtre pour référence.
 */
function RouteViewport({ children }: { children: ReactNode }): JSX.Element {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  // Entrée d'écran + restauration du défilement (cf. `use-route-motion.ts`).
  useRouteMotion(ref);
  return (
    <div ref={ref} className={shouldShowBottomNav(pathname) ? BOTTOM_NAV_SPACER_CLASS : undefined}>
      {children}
    </div>
  );
}

function AppShell(): JSX.Element {
  const { isReady } = useAuth();
  // Abonnement locale au point le plus haut sous le router : `t()`/`localize()`
  // lisent `useLocaleStore.getState()` sans souscrire, donc seul un re-render
  // d'un ancêtre repeint l'arbre. En souscrivant ici, tout switch FR/EN
  // re-render NavShell + AppRoutes (éléments recréés, non mémoïsés) → toutes les
  // chaînes `t()` se réévaluent. Effet de bord : `<html lang>` correct (a11y/SEO).
  const locale = useLocaleStore((s) => s.locale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  if (!isReady) return <Splash />;
  return (
    <>
      <NavShell />
      {/* Écouteurs de notification de campagne (E13/1) — au-dessus des routes,
          donc ils survivent au changement d'écran : le joueur reçoit le toast
          depuis sa fiche, pas seulement depuis le hub de sa campagne. */}
      <CampaignNotifications />
      <RouteViewport>
          <AppRoutes />
      </RouteViewport>
      {/* Barre de destinations au pouce (mobile). Rendue APRÈS les routes pour
          passer au-dessus d'elles dans le DOM ; elle décide seule des écrans où
          elle s'efface (cf. `lib/bottom-nav-visibility.ts`). */}
      <BottomNav />
    </>
  );
}
