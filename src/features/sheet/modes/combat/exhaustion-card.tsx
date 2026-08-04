import { useState, type JSX } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { useLocaleStore } from '@/shared/lib/slices/locale-slice';
import type { Character } from '@/shared/types/character';

import { useUpdateCharacter } from '../../use-update-character';
import { ConditionDetailModal } from './condition-detail-modal';

interface ExhaustionCardProps {
  character: Character;
  readOnly?: boolean;
}

/** Niveau d'épuisement maximal (SRD 2024 : niveau 6 = mort). */
const MAX_EXHAUSTION = 6;

/**
 * Carte « Épuisement » du mode Combat.
 *
 * L'état Épuisement (`character.exhaustion`, 0–6) n'était affiché ni éditable
 * nulle part — le repos long le décrémentait à l'aveugle. Cette carte le rend
 * visible et jouable :
 *  - jauge de 6 segments (niveau courant rempli) ;
 *  - steppers −/+ (0..6), écriture via `updateCharacter` (diff auto → events) ;
 *  - résumé chiffré de la pénalité au niveau courant (Tests d20 −2×niv,
 *    Vitesse −1,50 m × niv FR / −5 ft × niv EN) — règle SRD 2024 ;
 *  - « Lire la règle » ⇒ texte officiel de l'état dans la MÊME modale que tous
 *    les autres états de la fiche + note de mort au niveau 6.
 *
 * Lecture seule (PJ mort / lecture MJ) ⇒ steppers masqués (la jauge reste
 * visible). Toujours rendue (même à 0) : l'épuisement est un état que le joueur
 * doit pouvoir incrémenter à tout moment (privation de sommeil, sorts, etc.).
 */
export function ExhaustionCard({
  character,
  readOnly = false,
}: ExhaustionCardProps): JSX.Element {
  const { updateCharacter, isUpdating } = useUpdateCharacter(character);
  const locale = useLocaleStore((s) => s.locale);
  const [ruleOpen, setRuleOpen] = useState<boolean>(false);

  const level = character.exhaustion;

  async function setLevel(next: number): Promise<void> {
    if (readOnly || isUpdating) return;
    const clamped = Math.max(0, Math.min(MAX_EXHAUSTION, next));
    if (clamped === level) return;
    await updateCharacter({ exhaustion: clamped });
  }

  // Pénalité chiffrée au niveau courant (SRD 2024). Vitesse : 1,5 m (FR) ou
  // 5 ft (EN) par niveau — l'unité suit la locale, comme le reste de la fiche.
  const speedPenalty =
    locale === 'fr'
      ? (level * 1.5).toLocaleString('fr-FR')
      : String(level * 5);
  const penaltyLine = t('sheet.combat.exhaustion.penalty')
    .replace('{d20}', String(level * 2))
    .replace('{speed}', speedPenalty);

  return (
    <Card>
      <CardHeader>
        <h3>{t('sheet.combat.exhaustion.title')}</h3>
      </CardHeader>

      <div className="flex items-center justify-between gap-3">
        {!readOnly && (
          <button
            type="button"
            onClick={() => void setLevel(level - 1)}
            disabled={isUpdating || level === 0}
            aria-label={t('sheet.combat.exhaustion.decrease')}
            className="grid size-9 place-items-center rounded-pill border border-teal/40 bg-teal/10 font-display text-[20px] font-black text-teal transition-all duration-200 ease-base hover:border-teal hover:bg-teal/20 disabled:opacity-30"
          >
            −
          </button>
        )}

        {/* Jauge de 6 segments — rouge croissant. */}
        <div className="flex flex-1 items-center justify-center gap-1.5">
          {Array.from({ length: MAX_EXHAUSTION }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-2.5 flex-1 rounded-full transition-colors duration-200 ease-base',
                i < level ? 'bg-crimson' : 'bg-white/10',
              )}
            />
          ))}
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => void setLevel(level + 1)}
            disabled={isUpdating || level === MAX_EXHAUSTION}
            aria-label={t('sheet.combat.exhaustion.increase')}
            className="grid size-9 place-items-center rounded-pill border border-crimson/40 bg-crimson/10 font-display text-[20px] font-black text-crimson transition-all duration-200 ease-base hover:border-crimson hover:bg-crimson/20 disabled:opacity-30"
          >
            +
          </button>
        )}
      </div>

      <p className="mt-3 text-center font-title text-[11px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
        {level === 0
          ? t('sheet.combat.exhaustion.none')
          : `${t('sheet.combat.exhaustion.level').replace('{n}', String(level))} · ${penaltyLine}`}
      </p>

      {level >= MAX_EXHAUSTION && (
        <p className="mt-1 text-center font-title text-[11px] font-bold uppercase tracking-[0.16em] text-crimson">
          {t('sheet.combat.exhaustion.death')}
        </p>
      )}

      {/*
        E11 / D-12 — le texte SRD pèse 7 lignes. Déroulé en permanence, il
        faisait de cette carte 2,5 fois la hauteur de ses voisines et étirait
        toute la rangée du bento. Il passe derrière la MÊME modale que les autres
        états de la fiche (`ConditionDetailModal`) : un seul geste à apprendre,
        et la règle reste à une tape — y compris au niveau 0, où elle a sa valeur
        pédagogique sans coûter sept lignes.
      */}
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={() => setRuleOpen(true)}
          aria-haspopup="dialog"
          className="font-title text-[10px] font-bold uppercase tracking-[0.18em] text-text-tertiary underline decoration-dotted underline-offset-4 transition-colors duration-200 ease-base hover:text-gold-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40"
        >
          {t('sheet.combat.exhaustion.readRule')}
        </button>
      </div>

      <ConditionDetailModal
        conditionId={ruleOpen ? 'exhaustion' : null}
        onRemove={null}
        onClose={() => setRuleOpen(false)}
      />
    </Card>
  );
}
