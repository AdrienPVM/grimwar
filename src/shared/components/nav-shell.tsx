import type { JSX } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { cn } from '../lib/cn';
import { t } from '../lib/i18n';

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
 *   - sur `/character/:id` et `/create` → bouton « ← Retour » à gauche
 *   - avatar (droite) : initiale du user ; tap noop en S1 (placeholder plan 35)
 *   - pas de switcher de perso dédié S1 — retour à library + tap autre card
 *
 * Le `padding-top` global de chaque `<main>` doit compenser ~60px (le shell
 * est rendu hors flux car sticky : la main suit toujours, mais on évite que
 * le contenu se cache derrière au scroll-up extrême ou en mobile <56px).
 */
export function NavShell(): JSX.Element {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const showBack = pathname !== '/' && pathname !== '';
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
        {showBack ? (
          <Link
            to="/"
            aria-label={t('nav.back.aria')}
            className={cn(
              'inline-flex items-center gap-2 rounded-pill border border-white-8 bg-white/[0.04]',
              'px-3 py-1.5 font-title text-[10px] font-bold uppercase tracking-[0.18em] text-gold-bright',
              'transition-all hover:border-soft hover:bg-gold-bright/10 active:scale-[0.96]',
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
            className="flex items-center gap-3 font-display text-[17px] font-bold uppercase tracking-[0.24em] text-gold-bright transition-colors hover:text-gold-lite"
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
          // Placeholder plan 35 — Account management : tap ouvrira un menu
          // (profil, paramètres, GDPR, déconnexion). Noop en S1 pour ne pas
          // afficher d'UI vide ; les hooks de focus + click sont prêts.
          navigate('/');
        }}
        className={cn(
          'flex h-[38px] w-[38px] items-center justify-center',
          'bg-gradient-to-br from-gold-bright to-gold-dim text-ink',
          'font-display text-sm font-bold',
          'shadow-[0_4px_14px_rgba(220,184,108,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]',
          'transition-transform hover:scale-105 active:scale-95',
        )}
        style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
      >
        {avatarLetter}
      </button>
    </nav>
  );
}
