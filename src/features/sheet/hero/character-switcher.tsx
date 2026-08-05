import { useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCharactersList } from '@/features/library/use-characters-list';
import { DetailModal } from '@/shared/components/detail-modal';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';

import { usePermissionContext } from '../permissions-context';

/**
 * Bascule d'une fiche à l'autre depuis le nom du personnage.
 *
 * **Le besoin.** Passer d'un personnage à un autre imposait de remonter à la
 * bibliothèque puis de rouvrir une fiche : deux écrans et un aller-retour pour
 * un geste qu'on fait souvent — le joueur qui a un second personnage, et
 * surtout le meneur qui suit plusieurs fiches. Le nom du personnage est
 * exactement l'endroit où l'on s'attend à pouvoir changer de personnage.
 *
 * **Quand elle ne s'affiche pas.** En omni-édition MJ, on consulte la fiche
 * d'un joueur : proposer d'aller vers SES propres personnages depuis là serait
 * une sortie déguisée du contexte de campagne. Et avec un seul personnage, le
 * titre reste un titre — un bouton qui n'ouvre que sur soi-même est du bruit.
 */
export function CharacterSwitcher({
  currentId,
  children,
  className,
}: {
  currentId: string;
  children: string;
  className?: string;
}): JSX.Element {
  const { isDMEdit } = usePermissionContext();
  const { characters } = useCharactersList();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const others = characters.filter((c) => c.id !== currentId);
  if (isDMEdit || others.length === 0) {
    return <span className={className}>{children}</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={t('sheet.switcher.open')}
        data-testid="character-switcher-trigger"
        className={cn(
          className,
          'group inline-flex items-center gap-2 rounded-card-sm px-2 py-1',
          'transition-colors duration-150 ease-base hover:bg-white/[0.05] active:scale-[0.98]',
        )}
      >
        {children}
        {/* Chevron typographique et non une icône du sprite : le sprite n'en
            contient pas, et en inventer une pour un seul usage coûterait plus
            que le caractère lui-même. */}
        <span
          aria-hidden="true"
          className="flex-shrink-0 text-[0.55em] leading-none text-gold/60 transition-transform duration-150 ease-base group-hover:translate-y-px"
        >
          ▾
        </span>
      </button>

      <DetailModal
        open={open}
        onClose={() => setOpen(false)}
        titleId="character-switcher-title"
      >
          <div className="p-6">
            <h2
              id="character-switcher-title"
              className="font-display text-lg font-bold uppercase tracking-[0.14em] text-gold-bright"
            >
              {t('sheet.switcher.title')}
            </h2>
            <p className="mt-1 font-serif text-body-sm italic text-text-tertiary">
              {t('sheet.switcher.hint')}
            </p>
            <ul className="mt-5 flex flex-col gap-2">
              {others.map((character) => (
                <li key={character.id}>
                  <button
                    type="button"
                    data-testid="character-switcher-option"
                    onClick={() => {
                      setOpen(false);
                      navigate(`/character/${character.id}`);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-card-sm border border-white-8 bg-white/[0.025] px-4 py-3 text-left',
                      'transition-all duration-150 ease-base hover:-translate-y-px hover:border-soft hover:bg-white/[0.04] active:scale-[0.99]',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-soft bg-bg-3/60 font-display text-body text-gold-bright"
                    >
                      {(character.portrait.value || character.name[0] || '?').toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-serif text-body text-text">
                        {character.name}
                      </span>
                      <span className="block font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
                        {t('sheet.switcher.level')} {character.totalLevel}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="font-title text-meta text-text-faint"
                    >
                      ›
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
      </DetailModal>
    </>
  );
}
