import { useMemo, useState } from 'react';

import { Button } from '@/shared/components/button';
import { rollDamage } from '@/shared/lib/dice';
import { localize, t } from '@/shared/lib/i18n';
import { abilityModifier } from '@/shared/lib/rules/abilities';
import { proficiencyBonus } from '@/shared/lib/rules/multiclass';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character } from '@/shared/types/character';
import type { Spell } from '@/shared/types/content';

import { rollWithFlags } from '../essence/roll-with-flags';
import { useUpdateCharacter } from '../../use-update-character';
import { consumeSlot, type SpellcastingClassEntry } from './spell-slots';

interface SpellDetailModalProps {
  character: Character;
  spell: Spell;
  /** Classe(s) lanceuse(s) du perso — utilisé pour déterminer l'ability du sort. */
  spellcastingClasses: readonly SpellcastingClassEntry[];
  readOnly: boolean;
  onClose: () => void;
}

const DAMAGE_RE = /(\d+d\d+(?:[+-]\d+)?)/i;

/**
 * Modale détail d'un sort. Affiche le texte complet, les composantes, durée,
 * etc., et propose "Lancer le sort". Si non-cantrip → ouvre un slot picker
 * pour choisir le niveau de lancement (impossible de monter en niveau si pas
 * d'emplacement disponible). À l'envoi :
 *
 *  1. Consomme le slot choisi (sauf cantrip).
 *  2. Si une formule de dégâts est détectée dans le texte, fait un roll de
 *     dégâts via dice.ts. Les jets d'attaque (d20) sont gérés en aval par
 *     `rollWithFlags` pour respecter le pivot d'exhaustion/inspiration.
 *  3. Si le sort est `concentration: true`, set `currentConcentration` et casse
 *     toute concentration précédente avec un toast d'avertissement.
 *
 * Plan 09 step 10-11 + Notes d'Adrien : "Concentration : un seul sort à la
 * fois ; un nouveau casse l'ancien avec toast."
 */
export function SpellDetailModal({
  character,
  spell,
  spellcastingClasses,
  readOnly,
  onClose,
}: SpellDetailModalProps): JSX.Element {
  // Choix de la classe lanceuse (si multi-class) : on prend la première par
  // défaut, l'utilisateur peut basculer via un sélecteur si plusieurs.
  const [activeClassId, setActiveClassId] = useState<string>(
    spellcastingClasses[0]?.classId ?? '',
  );
  const activeClass = spellcastingClasses.find((c) => c.classId === activeClassId);

  const isCantrip = spell.level === 0;
  const minSlotLevel = Math.max(1, spell.level);
  const availableSlots = useMemo(
    () => listAvailableSlots(character, minSlotLevel),
    [character, minSlotLevel],
  );
  const [chosenLevel, setChosenLevel] = useState<number>(
    availableSlots[0] ?? minSlotLevel,
  );

  const { updateCharacter } = useUpdateCharacter(character.id);
  const [busy, setBusy] = useState<boolean>(false);

  async function handleCast(): Promise<void> {
    if (readOnly || busy) return;
    if (!activeClass && !isCantrip) {
      showToast({ kind: 'info', title: 'Aucune classe lanceuse', sub: 'Le sort ne peut être lancé.' });
      return;
    }
    setBusy(true);
    try {
      const patch: Partial<Character> = {};

      // 1. Consommation du slot (sauf cantrip).
      if (!isCantrip) {
        const nextSlots = consumeSlot(character.spellSlots, chosenLevel);
        if (!nextSlots) {
          showToast({
            kind: 'fumble',
            title: 'Plus d\'emplacement',
            sub: `Aucun emplacement de niv. ${chosenLevel} disponible.`,
          });
          return;
        }
        patch.spellSlots = nextSlots;
      }

      // 2. Concentration : casse l'ancienne, pose la nouvelle.
      if (spell.concentration) {
        if (character.currentConcentration && character.currentConcentration.spellId !== spell.id) {
          showToast({
            kind: 'info',
            title: 'Concentration brisée',
            sub: 'Le sort précédent prend fin.',
            durationMs: 2400,
          });
        }
        patch.currentConcentration = {
          spellId: spell.id,
          slotLevel: isCantrip ? 0 : chosenLevel,
        };
      }

      if (Object.keys(patch).length > 0) await updateCharacter(patch);

      // 3. Jet d'attaque (d20) via rollWithFlags si le sort a une attaque.
      // L'attaque est typiquement signalée par "jet d'attaque" dans le texte FR.
      // Pour V1 on garde simple : on n'auto-trigger pas le d20 — le joueur fait
      // ses jets à la main via le radial (plan 11) ; ici on roule juste les
      // éventuels dégâts trouvés dans le texte.
      const damageFormula = extractDamageFormula(localize(spell.description));
      const spellName = localize(spell.name);
      if (damageFormula) {
        const dmg = rollDamage(damageFormula);
        showToast({
          kind: 'crit',
          title: spellName,
          big: `${dmg.total}`,
          sub: `${damageFormula} → ${dmg.rolls.join(' + ')}${isCantrip ? '' : ` · slot niv. ${chosenLevel}`}`,
          durationMs: 2800,
        });
      } else {
        const pb = proficiencyBonus(character.totalLevel);
        const ability = activeClass?.ability;
        const dc =
          ability !== undefined
            ? 8 + pb + abilityModifier(character.abilities[ability])
            : null;
        showToast({
          kind: 'roll',
          title: spellName,
          big: isCantrip ? 'Tour' : `Niv. ${chosenLevel}`,
          sub: dc !== null ? `DD ${dc} si jet de sauvegarde requis` : 'Lancé',
        });
      }

      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function handleAttackRoll(): Promise<void> {
    if (readOnly || !activeClass) return;
    const mod = abilityModifier(character.abilities[activeClass.ability]);
    const pb = proficiencyBonus(character.totalLevel);
    await rollWithFlags({
      character,
      baseMod: pb + mod,
      label: `Attaque · ${localize(spell.name)}`,
      consumeInspiration: async () => {
        await updateCharacter({ inspiration: false });
      },
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="spell-detail-title"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/85 px-4 py-6 backdrop-blur-xl sm:items-center"
    >
      <div className="flex max-h-[90vh] w-full max-w-[460px] flex-col overflow-hidden rounded-card border border-soft bg-glass shadow-card-lg">
        <header className="flex items-start justify-between gap-3 border-b border-white-8 px-6 py-4">
          <div className="min-w-0">
            <h2
              id="spell-detail-title"
              className="font-display text-[20px] font-black tracking-[-0.02em] text-gold-bright"
            >
              {localize(spell.name)}
            </h2>
            <p className="font-ui text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
              {isCantrip ? 'Sort mineur' : `Niveau ${spell.level}`} ·{' '}
              {t(`school.${spell.school}`)}
              {spell.concentration && ' · Concentration'}
              {spell.ritual && ' · Rituel'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full border border-white-8 px-3 py-1 font-title text-[10px] uppercase tracking-[0.18em] text-text-tertiary transition-colors hover:border-soft hover:text-gold-bright"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <dl className="mb-4 grid grid-cols-2 gap-3 font-serif text-body-sm">
            <Meta label="Temps">{localize(spell.castingTime)}</Meta>
            <Meta label="Portée">{localize(spell.range)}</Meta>
            <Meta label="Compos.">{componentsLabel(spell)}</Meta>
            <Meta label="Durée">{localize(spell.duration)}</Meta>
          </dl>

          <p className="whitespace-pre-line font-serif text-body text-text-secondary">
            {localize(spell.description)}
          </p>

          {spell.atHigherLevels && (
            <div className="mt-4 rounded-card-sm border border-amethyst/25 bg-amethyst/[0.06] px-4 py-3">
              <p className="mb-1 font-title text-[10px] font-bold uppercase tracking-[0.2em] text-amethyst">
                À niveau supérieur
              </p>
              <p className="font-serif text-body-sm text-text-secondary">
                {localize(spell.atHigherLevels)}
              </p>
            </div>
          )}
        </div>

        <footer className="border-t border-white-8 px-6 py-4">
          {spellcastingClasses.length > 1 && (
            <label className="mb-3 flex flex-col gap-1">
              <span className="font-title text-[9px] font-bold uppercase tracking-[0.22em] text-text-tertiary">
                Classe lanceuse
              </span>
              <select
                value={activeClassId}
                onChange={(e) => setActiveClassId(e.target.value)}
                className="rounded-card-sm border border-white-8 bg-bg-2/60 px-3 py-2 font-serif text-body text-text"
              >
                {spellcastingClasses.map((c) => (
                  <option key={c.classId} value={c.classId}>
                    {c.name} (niv. {c.level})
                  </option>
                ))}
              </select>
            </label>
          )}

          {!isCantrip && (
            <div className="mb-3">
              <p className="mb-1 font-title text-[9px] font-bold uppercase tracking-[0.22em] text-text-tertiary">
                Emplacement
              </p>
              {availableSlots.length === 0 ? (
                <p className="font-serif text-body-sm italic text-crimson">
                  Aucun emplacement de niveau {minSlotLevel} ou supérieur disponible.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableSlots.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setChosenLevel(lvl)}
                      className={
                        lvl === chosenLevel
                          ? 'rounded-pill border border-gold-bright bg-gradient-to-b from-gold-bright to-gold px-4 py-1.5 font-title text-[10px] font-bold uppercase tracking-[0.18em] text-ink'
                          : 'rounded-pill border border-white-8 bg-white/[0.04] px-4 py-1.5 font-title text-[10px] font-bold uppercase tracking-[0.18em] text-text-secondary hover:border-soft hover:text-gold-bright'
                      }
                    >
                      Niv. {lvl}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">
              Fermer
            </Button>
            {activeClass && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleAttackRoll()}
                disabled={readOnly}
                className="flex-1"
                title="Lance un d20 + bonus d'attaque du sort"
              >
                Jet d'att.
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleCast()}
              disabled={readOnly || busy || (!isCantrip && availableSlots.length === 0)}
              className="flex-1"
            >
              {busy ? '…' : 'Lancer'}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <dt className="font-title text-[9px] font-bold uppercase tracking-[0.22em] text-text-tertiary">
        {label}
      </dt>
      <dd className="text-text">{children}</dd>
    </div>
  );
}

function componentsLabel(spell: Spell): string {
  const parts: string[] = [];
  if (spell.components.v) parts.push('V');
  if (spell.components.s) parts.push('S');
  if (spell.components.m) parts.push('M');
  return parts.join(' · ') || '—';
}

/**
 * Liste des niveaux d'emplacements disponibles `>= minLevel` avec
 * `current > 0`. Retourne dans l'ordre croissant.
 */
function listAvailableSlots(character: Character, minLevel: number): number[] {
  const out: number[] = [];
  for (let lvl = minLevel; lvl <= 9; lvl += 1) {
    const slot = character.spellSlots[String(lvl)];
    if (slot && slot.current > 0) out.push(lvl);
  }
  return out;
}

/**
 * Cherche un pattern "NdX[+/-Y]" dans la description FR du sort pour rouler
 * les dégâts automatiquement. C'est une heuristique pragmatique en attendant
 * le moteur de plan 12 (qui mappera les dégâts canoniques par sort).
 */
function extractDamageFormula(text: string): string | null {
  const m = text.match(DAMAGE_RE);
  return m ? m[1]! : null;
}
