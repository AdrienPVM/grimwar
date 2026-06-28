import { useMemo, useState } from 'react';

import { Card, CardAction, CardHeader } from '@/shared/components/card';
import { Icon } from '@/shared/components/icon';
import { Tooltip } from '@/shared/components/tooltip';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import { preparationCap, togglePrepared } from '@/shared/lib/rules/spell-preparation';
import type { Character } from '@/shared/types/character';
import type { Spell } from '@/shared/types/content';

import { useUpdateCharacter } from '../../use-update-character';
import { SpellDamageChip } from './spell-damage-chip';

interface WizardSpellbookSectionsProps {
  character: Character;
  /** Catalogue de sorts (typiquement `useContent('spells').data`). */
  spells: readonly Spell[];
  onSpellSelect: (spell: Spell) => void;
  /** Lecture seule (perso mort OU lecture MJ) : masque le mode préparation. */
  readOnly?: boolean;
}

/**
 * Sections « Sorts préparés » et « Grimoire » pour le Magicien (plan 13.9
 * commit 4c — décision Adrien UAT 4b), avec **préparation interactive**.
 *
 * Pourquoi un composant dédié au lieu d'étendre <SpellList> :
 * - L'UX cible est DEUX cartes visuellement distinctes, pas un filtre dans
 *   la même carte. Le grimoire n'est pas un sous-état des préparés ; les
 *   inscrits-non-préparés sont juste « lisibles le matin » mais inutilisables
 *   aujourd'hui (règle 5e). C'est sémantiquement deux listes, pas une.
 *
 * Préparation (cette passe) : contrairement au <PreparationEditor> des
 * préparateurs de liste complète (Clerc, Druide, Paladin), le Magicien prépare
 * depuis son **grimoire** — le pool de candidats est `knownSpells.wizard`, pas
 * la liste de classe entière. Le bouton « Modifier » bascule en mode édition :
 * un tap sur un sort de niveau ≥ 1 le prépare (depuis le Grimoire) ou le retire
 * (depuis Préparés), dans la limite du plafond SRD 2024
 * (`spellProgression.spellsKnownOrPrepared`, Magicien L1 = 4). Les sorts mineurs
 * (niveau 0) sont **toujours disponibles** — non comptabilisés, non toggables.
 * Hors mode édition, un tap ouvre la modale détail (comportement historique).
 *
 * Écriture immédiate au toggle via `updateCharacter` (`preparedSpells.wizard`) ;
 * la préparation est une configuration entre sessions → **aucun événement
 * journal** (le diff-logger ne touche pas `preparedSpells`).
 *
 * Catégorie 6 (intersections) : `Préparés ⊂ Grimoire connu`. Un sort dans
 * `preparedSpells.wizard` apparaît UNIQUEMENT dans la section Préparés. Un
 * sort dans `knownSpells.wizard \ preparedSpells.wizard` apparaît UNIQUEMENT
 * dans la section Grimoire. Aucun sort hors `knownSpells.wizard` n'apparaît
 * dans une des deux sections.
 */
export function WizardSpellbookSections({
  character,
  spells,
  onSpellSelect,
  readOnly = false,
}: WizardSpellbookSectionsProps): JSX.Element | null {
  const { data: classCatalog } = useContent('classes');
  const { updateCharacter, isUpdating } = useUpdateCharacter(character);
  const [editMode, setEditMode] = useState<boolean>(false);

  const { prepared, grimoireOnly } = useMemo(() => {
    const knownIds = new Set(character.knownSpells.wizard ?? []);
    const preparedIds = new Set(character.preparedSpells.wizard ?? []);
    const byId = new Map<string, Spell>();
    for (const s of spells) byId.set(s.id, s);

    const preparedList: Spell[] = [];
    const grimoireList: Spell[] = [];
    // Tri stable : on suit l'ordre des knownIds, puis on regroupe par niveau
    // ASC, puis par name.fr ASC à l'intérieur de chaque niveau.
    for (const id of knownIds) {
      const spell = byId.get(id);
      if (!spell) continue;
      if (preparedIds.has(id)) preparedList.push(spell);
      else grimoireList.push(spell);
    }
    const sortFn = (a: Spell, b: Spell): number => {
      if (a.level !== b.level) return a.level - b.level;
      return localize(a.name).localeCompare(localize(b.name), 'fr');
    };
    preparedList.sort(sortFn);
    grimoireList.sort(sortFn);
    return { prepared: preparedList, grimoireOnly: grimoireList };
  }, [character.knownSpells.wizard, character.preparedSpells.wizard, spells]);

  // Niveau du Magicien (multiclasse : par classe) — la cap est par classe.
  const wizardLevel = useMemo(
    () => character.classes.find((c) => c.classId === 'wizard')?.level ?? 0,
    [character.classes],
  );
  const wizardDef = useMemo(
    () => classCatalog.find((c) => c.id === 'wizard'),
    [classCatalog],
  );
  const cap = preparationCap(wizardDef, wizardLevel);

  // Le plafond ne compte QUE les sorts de niveau ≥ 1 (les sorts mineurs sont
  // toujours préparés et ne consomment pas d'emplacement de préparation).
  const preparedIds = useMemo(
    () => character.preparedSpells.wizard ?? [],
    [character.preparedSpells.wizard],
  );
  const preparedLeveledCount = prepared.filter((s) => s.level >= 1).length;
  const atCap = preparedLeveledCount >= cap;

  // Si le perso n'est pas un Magicien (knownSpells.wizard absent ou vide), on
  // ne rend rien : MagieMode bascule sur la SpellList générique.
  if (prepared.length === 0 && grimoireOnly.length === 0) return null;

  async function toggle(spell: Spell): Promise<void> {
    if (readOnly || isUpdating || !editMode) return;
    // Sorts mineurs : toujours disponibles, jamais (dé)préparables.
    if (spell.level === 0) return;
    const isPrepared = preparedIds.includes(spell.id);
    // Ajout bloqué au plafond (le retrait reste permis). Les lignes Grimoire
    // sont déjà désactivées au plafond — double barrière logique.
    if (!isPrepared && atCap) return;
    const next = togglePrepared(preparedIds, spell.id, cap);
    await updateCharacter({
      preparedSpells: { ...character.preparedSpells, wizard: next },
    });
  }

  // Le mode préparation n'a de sens que si un plafond existe (classe lanceuse à
  // ce niveau) et qu'on n'est pas en lecture seule.
  const canEdit = !readOnly && cap > 0;

  return (
    <>
      <section role="region" aria-label={`Sorts préparés · ${prepared.length}`}>
        <Card>
          <CardHeader>
            <h3>Sorts préparés · {prepared.length}</h3>
            {canEdit && (
              <Tooltip label={t('sheet.tip.editPreparation')} decorative>
                <CardAction
                  onClick={() => setEditMode((e) => !e)}
                  aria-expanded={editMode}
                  className={cn(
                    editMode &&
                      'border-gold bg-gradient-to-b from-gold-bright to-gold text-ink',
                  )}
                >
                  {editMode ? t('sheet.magie.prep.done') : t('sheet.magie.prep.edit')}
                </CardAction>
              </Tooltip>
            )}
          </CardHeader>
          {editMode && (
            <div className="mb-4 flex flex-col gap-2">
              <span
                className={cn(
                  'font-title text-[11px] font-bold uppercase tracking-[0.16em]',
                  atCap ? 'text-gold-bright' : 'text-text-tertiary',
                )}
              >
                {t('sheet.magie.prep.count')
                  .replace('{n}', String(preparedLeveledCount))
                  .replace('{cap}', String(cap))}
              </span>
              <p className="font-body text-[12px] leading-relaxed text-text-secondary">
                {t('sheet.magie.prep.hintWizard')}
              </p>
            </div>
          )}
          {prepared.length === 0 ? (
            <p className="font-serif text-body-sm italic text-text-tertiary">
              {t('sheet.magie.prep.emptyPrepared')}
            </p>
          ) : (
            <SpellRows
              spells={prepared}
              prepared
              editMode={editMode}
              atCap={atCap}
              isUpdating={isUpdating}
              onSpellSelect={onSpellSelect}
              onToggle={(spell) => void toggle(spell)}
            />
          )}
        </Card>
      </section>
      <section role="region" aria-label={`Grimoire · ${grimoireOnly.length}`}>
        <Card>
          <CardHeader>
            <h3>Grimoire · {grimoireOnly.length}</h3>
          </CardHeader>
          {grimoireOnly.length === 0 ? (
            <p className="font-serif text-body-sm italic text-text-tertiary">
              Tous vos sorts inscrits sont préparés aujourd'hui.
            </p>
          ) : (
            <SpellRows
              spells={grimoireOnly}
              prepared={false}
              editMode={editMode}
              atCap={atCap}
              isUpdating={isUpdating}
              onSpellSelect={onSpellSelect}
              onToggle={(spell) => void toggle(spell)}
            />
          )}
        </Card>
      </section>
    </>
  );
}

interface SpellRowsProps {
  spells: readonly Spell[];
  prepared: boolean;
  editMode: boolean;
  atCap: boolean;
  isUpdating: boolean;
  onSpellSelect: (spell: Spell) => void;
  onToggle: (spell: Spell) => void;
}

function SpellRows({
  spells,
  prepared,
  editMode,
  atCap,
  isUpdating,
  onSpellSelect,
  onToggle,
}: SpellRowsProps): JSX.Element {
  return (
    <ul className="flex flex-col gap-2">
      {spells.map((spell) => {
        const isCantrip = spell.level === 0;
        // En mode édition : un sort de niveau ≥ 1 non-préparé est bloqué si le
        // plafond est atteint ; un sort mineur n'est jamais toggable.
        const blocked = editMode && !prepared && !isCantrip && atCap;
        const rowDisabled = editMode && (isCantrip || blocked || isUpdating);
        return (
          <li key={spell.id}>
            <button
              type="button"
              onClick={() => (editMode ? onToggle(spell) : onSpellSelect(spell))}
              disabled={rowDisabled}
              aria-pressed={editMode ? prepared : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-card-sm border px-4 py-3 text-left transition-all duration-200 ease-base',
                'hover:-translate-y-px active:scale-[0.99] disabled:cursor-not-allowed',
                prepared
                  ? 'border-gold-dim/30 bg-gradient-to-b from-gold-bright/[0.08] to-gold/[0.02]'
                  : blocked
                    ? 'border-white-8 bg-white/[0.015] opacity-40'
                    : 'border-white-8 bg-white/[0.025] opacity-80',
                !rowDisabled && 'hover:border-soft',
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 flex-shrink-0 items-center justify-center border font-display text-[14px] font-black',
                  prepared
                    ? 'border-gold-dim bg-gradient-to-br from-gold-bright/25 to-gold/5 text-gold-bright'
                    : 'border-amethyst/30 bg-amethyst/10 text-amethyst',
                )}
                style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
                aria-hidden="true"
              >
                {isCantrip ? '·' : spell.level}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-serif text-body text-text">
                  {localize(spell.name)}
                </div>
                <div className="flex flex-wrap items-center gap-2 font-ui text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
                  <span>{t(`school.${spell.school}`)}</span>
                  {spell.concentration && (
                    <span className="rounded-full border border-amethyst/40 px-1.5 py-0.5 text-[8px] text-amethyst">
                      Concentr.
                    </span>
                  )}
                  {spell.ritual && (
                    <span className="rounded-full border border-teal/40 px-1.5 py-0.5 text-[8px] text-teal">
                      Rituel
                    </span>
                  )}
                  <SpellDamageChip spell={spell} />
                </div>
              </div>
              {editMode && (
                <TrailingAffordance
                  prepared={prepared}
                  isCantrip={isCantrip}
                  blocked={blocked}
                />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface TrailingAffordanceProps {
  prepared: boolean;
  isCantrip: boolean;
  blocked: boolean;
}

/** Pastille de droite en mode édition : préparé / toujours dispo / ajoutable. */
function TrailingAffordance({
  prepared,
  isCantrip,
  blocked,
}: TrailingAffordanceProps): JSX.Element {
  if (isCantrip) {
    return (
      <span className="flex-shrink-0 rounded-full border border-white-8 bg-white/[0.04] px-2 py-0.5 font-title text-[9px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
        {t('sheet.magie.prep.alwaysAvailable')}
      </span>
    );
  }
  if (prepared) {
    return (
      <span className="flex-shrink-0 rounded-full border border-gold-dim/40 bg-gold/[0.08] px-2 py-0.5 font-title text-[9px] font-bold uppercase tracking-[0.16em] text-gold-bright">
        {t('sheet.magie.prep.prepared')}
      </span>
    );
  }
  if (blocked) return <span className="flex-shrink-0" aria-hidden="true" />;
  return (
    <Icon name="i-plus" className="h-4 w-4 flex-shrink-0 text-text-faint" />
  );
}
