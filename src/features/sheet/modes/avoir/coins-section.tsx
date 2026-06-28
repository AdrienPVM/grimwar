import { useState } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { Tooltip } from '@/shared/components/tooltip';
import { cn } from '@/shared/lib/cn';
import { t, type StringKey } from '@/shared/lib/i18n';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character } from '@/shared/types/character';

import { useUpdateCharacter } from '../../use-update-character';

interface CoinsSectionProps {
  character: Character;
  readOnly: boolean;
}

/** Conversion canonique SRD : 1pp=10po, 1po=2el=10ar=100cu. Tout en po. */
const COIN_TO_GP = {
  cu: 0.01,
  ar: 0.1,
  el: 0.5,
  or: 1,
  pl: 10,
} as const;

type CoinKey = keyof typeof COIN_TO_GP;

/** Ordre d'affichage des pièces (cuivre → platine). */
const COIN_ORDER: readonly CoinKey[] = ['cu', 'ar', 'el', 'or', 'pl'];

/** Clé i18n du libellé court par type de pièce (Cu/Ar/Él/Or/Pl ↔ cp/sp/ep/gp/pp). */
const COIN_LABEL_KEYS: Record<CoinKey, StringKey> = {
  cu: 'sheet.avoir.coin.cu',
  ar: 'sheet.avoir.coin.ar',
  el: 'sheet.avoir.coin.el',
  or: 'sheet.avoir.coin.or',
  pl: 'sheet.avoir.coin.pl',
};

/**
 * Bourse de pièces : 5 chips alignés (cuivre, argent, électrum, or, platine).
 * Tap = bascule la chip en mode édition (input numérique) ; entrée valide ou
 * blur applique la modification. Total de richesse converti en po affiché en
 * bas du card. Read-only désactive l'édition.
 *
 * Décision : input clamp >= 0 (pas de coins négatifs). Pas de cap haut — un
 * gros butin reste réaliste.
 */
export function CoinsSection({ character, readOnly }: CoinsSectionProps): JSX.Element {
  const { updateCharacter, isUpdating } = useUpdateCharacter(character);
  const [editing, setEditing] = useState<CoinKey | null>(null);

  const totalGp = COIN_ORDER.reduce(
    (acc, key) => acc + character.inventory.coins[key] * COIN_TO_GP[key],
    0,
  );

  async function applyCoinChange(key: CoinKey, value: number): Promise<void> {
    if (readOnly) return;
    const safe = Math.max(0, Math.floor(value));
    if (safe === character.inventory.coins[key]) {
      setEditing(null);
      return;
    }
    await updateCharacter({
      inventory: {
        ...character.inventory,
        coins: { ...character.inventory.coins, [key]: safe },
      },
    });
    setEditing(null);
    showToast({
      kind: 'roll',
      title: t('sheet.avoir.coins.purseToast').replace('{coin}', t(COIN_LABEL_KEYS[key])),
      big: `${safe}`,
      sub: t('sheet.avoir.coins.updated'),
    });
  }

  return (
    <Card>
      <CardHeader>
        <h3>{t('sheet.avoir.coins.title')}</h3>
      </CardHeader>
      <div className="grid grid-cols-5 gap-2">
        {COIN_ORDER.map((key) => {
          const label = t(COIN_LABEL_KEYS[key]);
          const value = character.inventory.coins[key];
          const isZero = value === 0;
          const isEditing = editing === key;
          return (
            <Tooltip key={key} label={t('sheet.tip.editCoin')} decorative className="w-full">
            <button
              type="button"
              disabled={readOnly || isUpdating}
              onClick={() => !isEditing && setEditing(key)}
              aria-label={t('sheet.avoir.coins.editAria').replace('{coin}', label)}
              className={cn(
                'relative flex w-full flex-col items-center justify-center gap-1 rounded-card-sm border border-white-8 bg-ink/40 px-2 py-3 transition-all',
                'hover:border-gold-dim hover:-translate-y-0.5',
                'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0',
                isEditing && 'border-gold-bright bg-gold-bright/10',
              )}
            >
              <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.22em] text-gold">
                {label}
              </span>
              {isEditing ? (
                <input
                  autoFocus
                  type="number"
                  defaultValue={value}
                  min={0}
                  onBlur={(e) => void applyCoinChange(key, Number(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void applyCoinChange(key, Number((e.target as HTMLInputElement).value));
                    } else if (e.key === 'Escape') {
                      setEditing(null);
                    }
                  }}
                  className="w-full bg-transparent text-center font-display text-[22px] font-bold tracking-[-0.03em] text-gold-bright outline-none"
                />
              ) : (
                <span
                  className={cn(
                    'font-display text-[22px] font-bold tracking-[-0.03em]',
                    isZero ? 'text-text-tertiary' : 'text-text',
                  )}
                >
                  {value}
                </span>
              )}
            </button>
            </Tooltip>
          );
        })}
      </div>
      <p className="mt-3 text-center font-serif text-body-sm italic text-text-tertiary">
        {t('sheet.avoir.coins.totalValue').replace('{gp}', formatGp(totalGp))}
      </p>
    </Card>
  );
}

function formatGp(value: number): string {
  if (value === 0) return '0';
  if (value >= 100) return Math.round(value).toLocaleString('fr-FR');
  // Toujours afficher 1 décimale max pour éviter "0.10000000000001"
  return (Math.round(value * 10) / 10).toLocaleString('fr-FR');
}
