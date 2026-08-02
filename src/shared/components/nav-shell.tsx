import type { JSX } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { cn } from '../lib/cn';
import { t } from '../lib/i18n';
import { parentRouteFor } from '../lib/parent-route';

/**
 * Coquille de navigation persistante — header sticky monté dans App.tsx,
 * visible sur toutes les routes.
 *
 * Fidélité prototype (`prototype/grimwar.html` lignes 122-150) :
 *   - position sticky top 0, z-50
 *   - bg `rgba(8,6,14,0.6)` + backdrop-blur(30px) saturate(180%)
 *   - border-bottom blanc 8% + gradient pseudo-after subtil
 *   - brand : « ⚔ GrimWar » Cinzel Decorative, tracking 0.24em, gold-bright
 *   - avatar : 38px diamond gold (clip-path polygon) à droite
 *
 * Comportement :
 *   - sur `/` → uniquement la marque centrée à gauche, pas de bouton retour
 *   - ailleurs → bouton « ← Retour » qui remonte d'un cran dans la HIÉRARCHIE
 *     de l'app (`lib/parent-route.ts`), pas systématiquement à la bibliothèque :
 *     depuis une rencontre il ramène à la liste des rencontres, depuis une
 *     campagne à la liste des campagnes. L'`aria-label` nomme la destination
 *     réelle — il annonçait « Retour à la bibliothèque » sur les 15 routes où
 *     c'était faux.
 *   - avatar (droite) : initiale du user ; tap noop en S1 (placeholder plan 35)
 *   - pas de switcher de perso dédié S1 — retour à library + tap autre card
 *
 * Le `padding-top` global de chaque `<main>` doit compenser ~60px (le shell
 * est rendu hors flux car sticky : la main suit toujours, mais on évite que
 * le contenu se cache derrière au scroll-up extrême ou en mobile <56px).
 */
export function NavShell(): JSX.Element | null {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mode présentation / TV (route `…/tv`) : aucune chrome d'app — la carte
  // occupe tout l'écran pour la projection. Cf. `map-tv-screen.tsx`.
  if (/\/tv$/.test(pathname)) return null;

  // Remontée d'un cran dans la HIÉRARCHIE de l'app (et non dans l'historique),
  // cf. `lib/parent-route.ts`. `null` à la racine → on affiche la marque.
  const parent = parentRouteFor(pathname);
  const showBack = parent !== null;
  const avatarLetter =
    (user?.displayName?.[0] ?? user?.email?.[0] ?? 'A').toUpperCase();

  return (
    <nav
      aria-label={t('nav.aria')}
      className={cn(
        'sticky top-0 z-50 flex items-center justify-between',
        'h-[56px] px-4 sm:h-[60px] sm:px-6',
        'border-b border-white-8 bg-[rgba(8,6,14,0.6)] backdrop-blur-[30px] backdrop-saturate-[180%]',
        'after:absolute after:inset-x-[8%] after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-gold after:to-transparent after:opacity-60',
      )}
    >
      <div className="flex items-center gap-2">
        {parent ? (
          <Link
            to={parent.to}
            aria-label={t(parent.labelKey)}
            className={cn(
              'inline-flex items-center gap-2 rounded-pill border border-white-8 bg-white/[0.04]',
              'px-3 py-1.5 font-title text-[10px] font-bold uppercase tracking-[0.18em] text-gold-bright',
              'transition-all duration-200 ease-base hover:border-soft hover:bg-gold-bright/10 active:scale-[0.96]',
            )}
          >
            <span aria-hidden="true" className="text-base leading-none">
              ←
            </span>
            <span className="hidden sm:inline">{t('nav.back')}</span>
          </Link>
        ) : (
          <Link
            to="/"
            aria-label={t('nav.brand.aria')}
            className="flex items-center gap-3 font-display text-[17px] font-bold uppercase tracking-[0.24em] text-gold-bright transition-colors duration-200 ease-base hover:text-gold-lite"
          >
            <span aria-hidden="true" className="text-[22px] drop-shadow-[0_0_8px_var(--gold-glow)]">
              ⚔
            </span>
            <span>{t('splash.brand')}</span>
          </Link>
        )}
      </div>

      {showBack && (
        <div className="hidden sm:flex items-center gap-3 font-display text-[15px] font-bold uppercase tracking-[0.22em] text-gold opacity-80">
          <span aria-hidden="true" className="text-[18px] drop-shadow-[0_0_6px_var(--gold-glow)]">
            ⚔
          </span>
          <span>{t('splash.brand')}</span>
        </div>
      )}

      <button
        type="button"
        aria-label={t('nav.avatar.aria')}
        onClick={() => {
          // Tap → écran Compte (profil + préférences de jeu, amorce plan 35).
          // GDPR / abonnement / switch de langue restent différés au plan 35
          // complet (S5).
          navigate('/account');
        }}
        className={cn(
          'flex h-[38px] w-[38px] items-center justify-center',
          'bg-gradient-to-br from-gold-bright to-gold-dim text-ink',
          'font-display text-sm font-bold',
          'shadow-[0_4px_14px_rgba(220,184,108,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]',
          'transition-transform duration-200 ease-base hover:scale-105 active:scale-95',
        )}
        style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
      >
        {avatarLetter}
      </button>
    </nav>
  );
}
