import type { JSX } from 'react';

import { t } from '@/shared/lib/i18n';
import { getInvocationEntry } from '@/shared/lib/rules/eldritch-invocations';

interface InvocationEffectCardProps {
  slug: string;
}

/**
 * D13a — section structurée « Mécanique » de la modale d'une Manifestation
 * occulte. Rendue UNIQUEMENT pour les invocations dont l'effet runtime est
 * câblé au registre (cf. `src/shared/lib/rules/eldritch-invocations.ts`).
 *
 * Strictement parallèle à `<SpellDamageCard>` (plan D1) :
 *   - retourne `null` si pas d'effet câblé (D13b-e attendus → pas de placeholder
 *     trompeur tant que le moteur n'a pas la branche correspondante) ;
 *   - bordure + bg légers (cinabre côté dégâts / gold côté invocation) pour
 *     l'identifier visuellement comme un bloc « mécanique » distinct de la
 *     prose SRD.
 *
 * Aujourd'hui un seul cas : `armor-of-shadows` → label « CA = 13 + mod DEX »
 * + condition « sans armure équipée, bouclier cumulable ». Strict reflet du
 * SRD 5.2.1 (cf. `srd-invocations.ts` summary + `Mage Armor` du bundle SRD).
 */
export function InvocationEffectCard({
  slug,
}: InvocationEffectCardProps): JSX.Element | null {
  const entry = getInvocationEntry(slug);
  const effect = entry?.effect;
  if (!effect) return null;

  if (effect.kind === 'passive-mage-armor') {
    return (
      <div
        className="mt-4 rounded-card-sm border border-gold-dim/40 bg-gradient-to-b from-gold-bright/[0.08] to-gold/[0.02] px-4 py-3"
        data-testid="invocation-effect-card"
      >
        <p className="mb-2 font-title text-[10px] font-bold uppercase tracking-[0.2em] text-gold-bright">
          {t('sheet.essence.invocation.mechanicsTitle')}
        </p>
        <p
          className="font-display text-[15px] font-bold text-gold-bright"
          data-testid="invocation-effect-label"
        >
          {t('sheet.essence.invocation.armorOfShadows.label')}
        </p>
        <p className="mt-1 font-serif text-[12px] text-text-tertiary">
          {t('sheet.essence.invocation.armorOfShadows.condition')}
        </p>
      </div>
    );
  }

  if (effect.kind === 'passive-concentration-advantage') {
    return (
      <div
        className="mt-4 rounded-card-sm border border-gold-dim/40 bg-gradient-to-b from-gold-bright/[0.08] to-gold/[0.02] px-4 py-3"
        data-testid="invocation-effect-card"
      >
        <p className="mb-2 font-title text-[10px] font-bold uppercase tracking-[0.2em] text-gold-bright">
          {t('sheet.essence.invocation.mechanicsTitle')}
        </p>
        <p
          className="font-display text-[15px] font-bold text-gold-bright"
          data-testid="invocation-effect-label"
        >
          {t('sheet.essence.invocation.eldritchMind.label')}
        </p>
        <p className="mt-1 font-serif text-[12px] text-text-tertiary">
          {t('sheet.essence.invocation.eldritchMind.condition')}
        </p>
      </div>
    );
  }

  // Pas de `default` — l'exhaustivité TS strict garantit qu'on traite chaque
  // `kind` du discriminated union au moment de l'ajout.
  return null;
}
