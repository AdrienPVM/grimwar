import { useEffect, useRef, useState, type JSX } from 'react';

import { Card } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { deriveClassResourcePools } from '@/shared/lib/rules/class-resources';
import { applyLongRest, NO_VARIANTS } from '@/shared/lib/rules/long-rest';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { CampaignVariants } from '@/shared/types/campaign';
import type { Character } from '@/shared/types/character';

import { useUpdateCharacter } from '../../use-update-character';

interface LongRestButtonProps {
  character: Character;
  readOnly?: boolean;
  /**
   * Variantes de campagne. Par défaut `NO_VARIANTS` (personnage hors campagne →
   * règles 5e standard). Quand le plumbing des variantes de campagne vers la
   * fiche existera, l'écran passera ici les `settings.variants` réels.
   */
  variants?: CampaignVariants;
}

/** Délai au bout duquel le mode « confirmer » se réarme (ms). */
const CONFIRM_RESET_MS = 4000;

/**
 * Bouton « Repos long » (mode Combat).
 *
 * Applique un repos long via `applyLongRest` (pur, variant-aware) : PV→max
 * (sauf slowHealing), dés de vie regagnés (moitié du total), réserves de classe
 * + emplacements de sort réinitialisés, épuisement −1. Le patch passe par
 * `updateCharacter` (diff auto → events, aucun nouveau type d'événement).
 *
 * Sweeping → confirmation à deux temps inline : 1er tap = « Confirmer ? »
 * (se réarme après 4 s), 2e tap = applique. Pas de modale dédiée (léger,
 * mobile-friendly). Le toast résume PV rendus / dés regagnés / réserves.
 *
 * Notes variantes affichées sous le bouton : slowHealing (pas de PV auto),
 * grittyRealism (durée 7 jours). Lecture seule ⇒ rien rendu.
 */
export function LongRestButton({
  character,
  readOnly = false,
  variants = NO_VARIANTS,
}: LongRestButtonProps): JSX.Element | null {
  const { data: classes } = useContent('classes');
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

  async function doLongRest(): Promise<void> {
    if (isUpdating) return;
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setConfirming(false);

    const pools = deriveClassResourcePools(character, classes);
    const { patch, summary } = applyLongRest(character, pools, variants);
    await updateCharacter(patch);

    const parts: string[] = [];
    if (summary.hpHealed > 0)
      parts.push(t('sheet.combat.longRest.hpPart').replace('{n}', String(summary.hpHealed)));
    if (summary.hitDiceRegained > 0)
      parts.push(
        t('sheet.combat.longRest.hitDicePart').replace('{n}', String(summary.hitDiceRegained)),
      );
    if (summary.resourcesReset > 0)
      parts.push(t('sheet.combat.rest.resourcesPart').replace('{n}', String(summary.resourcesReset)));
    if (summary.exhaustionRemoved > 0) parts.push(t('sheet.combat.longRest.exhaustionPart'));

    showToast({
      kind: 'heal',
      title: t('sheet.combat.longRest.toastTitle'),
      sub: parts.length > 0 ? parts.join(' · ') : undefined,
    });
  }

  return (
    <Card>
      <button
        type="button"
        onClick={() => (confirming ? void doLongRest() : armConfirm())}
        disabled={isUpdating}
        className={cn(
          'w-full rounded-card-sm border px-4 py-3 font-title text-[12px] font-bold uppercase tracking-[0.18em] transition-all duration-200 ease-base disabled:opacity-50',
          confirming
            ? 'border-gold bg-gold/15 text-gold-bright hover:bg-gold/25'
            : 'border-white-8 bg-white/[0.02] text-text hover:border-white/20 hover:bg-white/[0.05]',
        )}
      >
        {confirming ? t('sheet.combat.longRest.confirm') : t('sheet.combat.longRest.button')}
      </button>
      {variants.slowHealing && (
        <p className="mt-2 text-center font-body text-[11px] leading-snug text-text-tertiary">
          {t('sheet.combat.longRest.slowHealingNote')}
        </p>
      )}
      {variants.grittyRealism && (
        <p className="mt-2 text-center font-body text-[11px] leading-snug text-text-tertiary">
          {t('sheet.combat.longRest.grittyNote')}
        </p>
      )}
    </Card>
  );
}
