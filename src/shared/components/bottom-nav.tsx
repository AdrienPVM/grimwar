import type { JSX } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import type { IconName } from '../design/icons';
import { cn } from '../lib/cn';
import { t, type StringKey } from '../lib/i18n';
import { shouldShowBottomNav } from '../lib/bottom-nav-visibility';
import { Icon } from './icon';

/**
 * Barre de navigation basse — les trois grands espaces de l'app, à portée de
 * pouce.
 *
 * POURQUOI : jusqu'ici la navigation vivait entièrement dans le bandeau HAUT
 * (marque, bouton Retour, avatar). Sur un téléphone tenu à une main autour
 * d'une table, le haut de l'écran est précisément la zone qu'on n'atteint pas
 * sans changer de prise — et changer de prise avec un dé dans l'autre main, on
 * ne le fait pas. Le bandeau haut garde ce qui relève du CONTEXTE (où suis-je,
 * comment je remonte d'un cran) ; le bas reçoit ce qui relève de la
 * DESTINATION (où je veux aller).
 *
 * Trois entrées, pas cinq : chaque cible fait ainsi un tiers de la largeur, et
 * les trois correspondent à des espaces réellement distincts. Le Compte reste
 * sur le losange du bandeau haut — on y va deux fois par mois, pas deux fois
 * par tour de jeu.
 *
 * Masquée à `lg+` : sur desktop les mêmes destinations sont rendues en rail
 * horizontal dans le bandeau haut (`nav-shell.tsx`), là où la souris les
 * atteint sans traverser l'écran.
 */

interface Tab {
  to: string;
  icon: IconName;
  labelKey: StringKey;
  /** `true` → actif sur l'égalité stricte seulement (cas de la racine). */
  exact?: boolean;
}

export const BOTTOM_NAV_TABS: readonly Tab[] = [
  { to: '/', icon: 'i-feather', labelKey: 'nav.tab.characters', exact: true },
  { to: '/campaigns', icon: 'i-shield', labelKey: 'nav.tab.campaigns' },
  { to: '/codex', icon: 'i-book', labelKey: 'nav.tab.codex' },
];

/**
 * `NavLink` gère `aria-current` seul, mais son `end` ne couvre pas notre besoin :
 * `/campaigns/:cid/journal` doit garder « Campagnes » allumé. On calcule donc
 * l'état actif nous-mêmes et on ne se sert de `NavLink` que pour le rendu.
 */
export function isTabActive(tab: Tab, pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (tab.exact) return path === tab.to;
  return path === tab.to || path.startsWith(`${tab.to}/`);
}

export function BottomNav(): JSX.Element | null {
  const { pathname } = useLocation();
  if (!shouldShowBottomNav(pathname)) return null;

  return (
    <nav
      aria-label={t('nav.tabs.aria')}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 lg:hidden',
        // Même verre que le bandeau haut : les deux bords de l'écran se
        // répondent au lieu de proposer deux matières différentes.
        'border-t border-white-8 bg-[rgba(8,6,14,0.72)] backdrop-blur-[30px] backdrop-saturate-[180%]',
        // Filet doré en miroir de celui du bandeau haut (`after` sur NavShell).
        'before:absolute before:inset-x-[8%] before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-gold before:to-transparent before:opacity-60',
        // Encoche / barre de gestes iOS : la rangée de taps reste au-dessus.
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className="mx-auto flex w-full max-w-[520px] items-stretch">
        {BOTTOM_NAV_TABS.map((tab) => {
          const active = isTabActive(tab, pathname);
          return (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-[60px] flex-col items-center justify-center gap-1',
                  'transition-colors duration-200 ease-base',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-bright/50',
                  active
                    ? 'text-gold-bright'
                    : 'text-text-tertiary hover:text-text-secondary active:text-gold-lite',
                )}
              >
                {/*
                  Repère de l'onglet actif : une barre dorée courte, ancrée sur
                  le bord HAUT de la barre. Elle grandit depuis le centre avec
                  la courbe `spring` — le ressort donne l'impression que le
                  repère se pose sur l'onglet plutôt qu'il n'y apparaît.
                */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-0 top-0 mx-auto h-[2px] w-8 rounded-pill bg-gold-bright',
                    'origin-center transition-all duration-350 ease-spring',
                    active
                      ? 'scale-x-100 opacity-100 shadow-[0_0_10px_var(--gold-glow)]'
                      : 'scale-x-0 opacity-0',
                  )}
                />
                <Icon
                  name={tab.icon}
                  className={cn(
                    'h-[22px] w-[22px] transition-transform duration-350 ease-spring',
                    active && 'scale-110 drop-shadow-[0_0_8px_var(--gold-glow)]',
                  )}
                />
                <span className="font-title text-[10px] font-bold uppercase tracking-[0.14em]">
                  {t(tab.labelKey)}
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
