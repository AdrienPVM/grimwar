import { useMemo, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { Card, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character } from '@/shared/types/character';

import { useUpdateCharacter } from '../../use-update-character';

interface ConcentrationCardProps {
  character: Character;
  readOnly?: boolean;
}

/**
 * Carte « Concentration » du mode Combat.
 *
 * `character.currentConcentration` est POSÉ au lancement d'un sort à
 * concentration (`spell-detail-modal`) mais n'était affiché nulle part : le
 * joueur n'avait aucun rappel de ce sur quoi il se concentre, ni moyen de
 * rompre volontairement sa concentration sans relancer un autre sort.
 *
 * Cette carte comble ce trou :
 *  - rendue UNIQUEMENT quand une concentration est active (sinon `null`) —
 *    c'est un état transitoire, pas une carte permanente comme l'épuisement ;
 *  - résout le nom du sort depuis le bundle `spells` (jamais codé en dur) ;
 *  - rappelle la règle officielle de jet sur dégâts (SRD 5.2.1 FR, glossaire
 *    « Concentration » : « jet de sauvegarde de Constitution… DD 10 ou la
 *    moitié des dégâts subis… le nombre le plus élevé étant retenu ») ;
 *  - permet de rompre volontairement la concentration (SRD : « pas d'action
 *    requise ») → `currentConcentration: null`.
 *
 * `currentConcentration` n'est PAS dans l'auto-diff de `useUpdateCharacter`
 * (cf. `character-diff.ts`, qui ne suit que hp/conditions/spellSlots/inventory) :
 * rompre la concentration ne génère donc aucun événement — même posture que le
 * repos court, aucun nouveau type d'événement introduit.
 *
 * Lecture seule (PJ mort / lecture MJ) ⇒ bouton « Rompre » masqué ; le rappel
 * de règle reste visible.
 */
export function ConcentrationCard({
  character,
  readOnly = false,
}: ConcentrationCardProps): JSX.Element | null {
  const { data: spells } = useContent('spells');
  const { updateCharacter, isUpdating } = useUpdateCharacter(character);

  const conc = character.currentConcentration;

  const spell = useMemo(
    () => (conc ? spells.find((s) => s.id === conc.spellId) ?? null : null),
    [spells, conc],
  );

  if (!conc) return null;

  const spellName = spell
    ? localize(spell.name)
    : t('sheet.combat.concentration.unknownSpell');
  const levelLabel =
    conc.slotLevel === 0
      ? t('sheet.combat.concentration.cantrip')
      : t('sheet.combat.concentration.castAt').replace('{n}', String(conc.slotLevel));

  async function breakConcentration(): Promise<void> {
    if (readOnly || isUpdating) return;
    await updateCharacter({ currentConcentration: null });
    showToast({
      kind: 'info',
      title: t('sheet.combat.concentration.broken'),
      sub: spellName,
    });
  }

  return (
    <Card className="border-amethyst/30 bg-amethyst/[0.05]">
      <CardHeader>
        <h3>{t('sheet.combat.concentration.title')}</h3>
      </CardHeader>

      <div className="flex items-center gap-3">
        <div
          className="grid size-11 flex-shrink-0 place-items-center border border-amethyst/40 bg-amethyst/10 font-display text-[15px] font-black text-amethyst"
          style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
          aria-hidden="true"
        >
          {conc.slotLevel === 0 ? '·' : conc.slotLevel}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-serif text-body text-text">{spellName}</div>
          <div className="font-title text-[10px] uppercase tracking-[0.18em] text-amethyst">
            {levelLabel}
          </div>
        </div>
      </div>

      <p className="mt-3 font-body text-[12px] leading-relaxed text-text-secondary">
        {t('sheet.combat.concentration.damageRule')}
      </p>

      {!readOnly && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void breakConcentration()}
          disabled={isUpdating}
          className="mt-4 w-full"
        >
          {t('sheet.combat.concentration.break')}
        </Button>
      )}
    </Card>
  );
}
