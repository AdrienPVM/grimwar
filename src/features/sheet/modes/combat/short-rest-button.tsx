import { useEffect, useRef, useState, type JSX } from 'react';

import { Card } from '@/shared/components/card';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { applyShortRest } from '@/shared/lib/rules/short-rest';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { CampaignVariants } from '@/shared/types/campaign';
import type { Character } from '@/shared/types/character';

import { useUpdateCharacter } from '../../use-update-character';

interface ShortRestButtonProps {
  character: Character;
  readOnly?: boolean;
  /**
   * Variantes de campagne. Seule `grittyRealism` change le repos court (durée
   * narrative 8 h, aucun effet mécanique). Par défaut aucune variante.
   */
  variants?: CampaignVariants;
}

/** Délai au bout duquel le mode « confirmer » se réarme (ms). */
const CONFIRM_RESET_MS = 4000;

const NO_VARIANTS: CampaignVariants = {
  featAtLevel1: false,
  flanking: false,
  slowHealing: false,
  grittyRealism: false,
};

/**
 * Bouton « Repos court » (mode Combat).
 *
 * Applique un repos court via `applyShortRest` (pur) : réinitialise les réserves
 * de classe `restoresOn: 'short'` (Second souffle, Fougue, Conduit divin, Forme
 * sauvage, Points de focalisation) **et les emplacements de pacte de
 * l'Occultiste** (`pact-magic-slots`, la seule magie qui recharge au repos
 * court). Ne rend AUCUN PV : le joueur dépense ses dés de vie via la carte
 * « Dés de vie » au-dessus (5e). Ne touche ni aux emplacements de sort standard,
 * ni à l'épuisement, ni aux réserves long-repos.
 *
 * Confirmation à deux temps inline, identique au repos long (1er tap arme,
 * réarme après 4 s, 2e tap applique). Le patch passe par `updateCharacter` →
 * diff auto vers les events, aucun nouveau type d'événement. Lecture seule
 * (PJ mort / lecture MJ) ⇒ rien rendu.
 */
export function ShortRestButton({
  character,
  readOnly = false,
  variants = NO_VARIANTS,
}: ShortRestButtonProps): JSX.Element | null {
  const { updateCharacter, isUpdating } = useUpdateCharacter(character);
  const [confirming, setConfirming] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  if (readOnly) return null;

  function armConfirm(): void {
    setConfirming(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setConfirming(false), CONFIRM_RESET_MS);
  }

  async function doShortRest(): Promise<void> {
    if (isUpdating) return;
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setConfirming(false);

    const { patch, summary } = applyShortRest(character);

    // Rien à recharger → on ne patche pas (évite un event vide), simple toast.
    if (summary.resourcesReset === 0) {
      showToast({
        kind: 'info',
        title: t('sheet.combat.shortRest.toastTitle'),
        sub: t('sheet.combat.shortRest.toastNone'),
      });
      return;
    }

    await updateCharacter(patch);

    const parts: string[] = [`${summary.resourcesReset} réserves`];
    if (summary.pactSlotsRestored) parts.push(t('sheet.combat.shortRest.pactNote'));

    showToast({
      kind: 'heal',
      title: t('sheet.combat.shortRest.toastTitle'),
      sub: parts.join(' · '),
    });
  }

  return (
    <Card>
      <button
        type="button"
        onClick={() => (confirming ? void doShortRest() : armConfirm())}
        disabled={isUpdating}
        className={cn(
          'w-full rounded-card-sm border px-4 py-3 font-title text-[12px] font-bold uppercase tracking-[0.18em] transition-all duration-200 ease-base disabled:opacity-50',
          confirming
            ? 'border-gold bg-gold/15 text-gold-bright hover:bg-gold/25'
            : 'border-white-8 bg-white/[0.02] text-text hover:border-white/20 hover:bg-white/[0.05]',
        )}
      >
        {confirming ? t('sheet.combat.shortRest.confirm') : t('sheet.combat.shortRest.button')}
      </button>
      <p className="mt-2 text-center font-body text-[11px] leading-snug text-text-tertiary">
        {t('sheet.combat.shortRest.hint')}
      </p>
      {variants.grittyRealism && (
        <p className="mt-2 text-center font-body text-[11px] leading-snug text-text-tertiary">
          {t('sheet.combat.shortRest.grittyNote')}
        </p>
      )}
    </Card>
  );
}
