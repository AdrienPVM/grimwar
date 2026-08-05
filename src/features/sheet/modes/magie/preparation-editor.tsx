import { useMemo, useState, type JSX } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { Icon } from '@/shared/components/icon';
import { Tooltip } from '@/shared/components/tooltip';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import {
  candidatePreparableSpells,
  preparationCap,
  togglePrepared,
} from '@/shared/lib/rules/spell-preparation';
import type { Character } from '@/shared/types/character';
import type { Spell } from '@/shared/types/content';

import { useUpdateCharacter } from '../../use-update-character';
import { unlockedSlotLevels } from './spell-slots';

interface PreparationEditorProps {
  character: Character;
  /** Id EN de la classe préparatrice (cleric / druid / paladin). */
  classId: string;
  /** Nom localisé de la classe (pour l'en-tête). */
  className: string;
  /** Niveau du personnage DANS cette classe (multiclasse : par classe). */
  classLevel: number;
  readOnly?: boolean;
}

/**
 * Éditeur de **préparation des sorts** pour un préparateur de liste complète
 * (Clerc, Druide, Paladin — le Magicien prépare depuis son grimoire et a sa
 * propre UI). Le personnage coche/décoche ses sorts préparés depuis l'intégralité
 * de la liste de classe, dans la limite du plafond SRD 2024
 * (`spellProgression.spellsKnownOrPrepared` au niveau courant).
 *
 * Écriture immédiate au toggle via `updateCharacter` (pas de bouton
 * « Enregistrer », comme les autres cartes interactives). La préparation est une
 * configuration entre sessions → **aucun événement journal** (le diff-logger ne
 * touche pas `preparedSpells`).
 *
 * Rendu repliable (fermé par défaut) : la liste de classe peut compter 15+
 * sorts. Transition de hauteur douce via le pattern `grid-rows-[0fr|1fr]`.
 *
 * Retourne `null` (rien à préparer) si le plafond est 0 ou si aucun sort de
 * classe n'est préparable (aucun emplacement débloqué).
 */
export function PreparationEditor({
  character,
  classId,
  className,
  classLevel,
  readOnly = false,
}: PreparationEditorProps): JSX.Element | null {
  const { data: classCatalog } = useContent('classes');
  const { data: spells } = useContent('spells');
  const { updateCharacter, isUpdating } = useUpdateCharacter(character);
  const [open, setOpen] = useState<boolean>(false);

  const classDef = useMemo(
    () => classCatalog.find((c) => c.id === classId),
    [classCatalog, classId],
  );
  const cap = preparationCap(classDef, classLevel);

  const maxLevel = useMemo(() => {
    const unlocked = unlockedSlotLevels(character, classCatalog);
    return unlocked.length > 0 ? Math.max(...unlocked) : 0;
  }, [character, classCatalog]);

  // M26 — les sorts appris hors liste de classe (parchemin, faveur) rejoignent
  // le pool : sans ça, un sort ajouté resterait impossible à préparer.
  const offListIds = useMemo(
    () => character.knownSpells[classId] ?? [],
    [character.knownSpells, classId],
  );

  const candidates = useMemo(
    () => candidatePreparableSpells(spells, classId, maxLevel, offListIds),
    [spells, classId, maxLevel, offListIds],
  );

  const prepared = useMemo(
    () => character.preparedSpells[classId] ?? [],
    [character.preparedSpells, classId],
  );
  const preparedSet = useMemo(() => new Set(prepared), [prepared]);
  const count = prepared.length;
  const atCap = count >= cap;
  const overCap = count > cap;

  const grouped = useMemo(() => groupByLevel(candidates), [candidates]);

  // Rien à préparer : pas de plafond (classe sans progression à ce niveau) ou
  // pas un seul sort de classe préparable → la carte n'a pas lieu d'être.
  if (cap === 0 || candidates.length === 0) return null;

  async function toggle(spell: Spell): Promise<void> {
    if (readOnly || isUpdating) return;
    // M26 — le plafond avertit, il ne refuse plus : c'est une valeur dérivée du
    // contenu, pas un invariant de données, et une table qui accorde un sort de
    // plus n'avait aucun recours.
    const next = togglePrepared(prepared, spell.id, cap);
    await updateCharacter({
      preparedSpells: { ...character.preparedSpells, [classId]: next },
    });
  }

  return (
    <Card>
      <CardHeader>
        <h3>
          {t('sheet.magie.prep.titleFor').replace('{class}', className)}
        </h3>
      </CardHeader>

      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            'font-title text-[11px] font-bold uppercase tracking-[0.16em]',
            overCap ? 'text-crimson' : atCap ? 'text-gold-bright' : 'text-text-tertiary',
          )}
        >
          {t('sheet.magie.prep.count')
            .replace('{n}', String(count))
            .replace('{cap}', String(cap))}
        </span>
        {!readOnly && (
          <Tooltip label={t('sheet.tip.editPreparation')} decorative>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="flex items-center gap-1.5 rounded-pill border border-gold-dim/40 bg-gold/[0.08] px-3 py-1.5 font-title text-[11px] font-bold uppercase tracking-[0.16em] text-gold-bright transition-all duration-200 ease-base hover:border-gold-dim hover:bg-gold/15"
            >
              <Icon name="i-feather" className="h-3.5 w-3.5" />
              {open ? t('sheet.magie.prep.done') : t('sheet.magie.prep.edit')}
            </button>
          </Tooltip>
        )}
      </div>

      <p className="mt-2 font-body text-[12px] leading-relaxed text-text-secondary">
        {t('sheet.magie.prep.hint')}
      </p>

      {overCap ? (
        <p role="status" className="mt-2 font-body text-[12px] leading-relaxed text-crimson">
          {t('sheet.magie.prep.overCap').replace('{cap}', String(cap))}
        </p>
      ) : null}

      {/* Disclosure : hauteur animée via grid-rows (contenu toujours monté). */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-base',
          open ? 'mt-3 grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-3">
            {grouped.map(([level, items]) => (
              <section key={level}>
                <h4 className="mb-1 font-title text-[10px] font-bold uppercase tracking-[0.22em] text-text-tertiary">
                  {t('sheet.magie.prep.levelLabel').replace('{n}', String(level))}
                </h4>
                <ul className="flex flex-col gap-2">
                  {items.map((spell) => {
                    const isPrepared = preparedSet.has(spell.id);
                    // Le plafond n'éteint plus les lignes : il se voit au
                    // compteur, qui passe au rouge dès qu'on le dépasse.
                    const blocked = false;
                    return (
                      <li key={spell.id}>
                        <button
                          type="button"
                          onClick={() => void toggle(spell)}
                          disabled={readOnly || isUpdating || blocked}
                          aria-pressed={isPrepared}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-card-sm border px-4 py-3 text-left transition-all duration-200 ease-base',
                            'hover:-translate-y-px active:scale-[0.99] disabled:cursor-not-allowed',
                            isPrepared
                              ? 'border-gold-dim/30 bg-gradient-to-b from-gold-bright/[0.08] to-gold/[0.02]'
                              : blocked
                                ? 'border-white-8 bg-white/[0.015] opacity-40'
                                : 'border-white-8 bg-white/[0.025] opacity-80 hover:border-soft',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-9 w-9 flex-shrink-0 items-center justify-center border font-display text-[13px] font-black',
                              isPrepared
                                ? 'border-gold-dim bg-gradient-to-br from-gold-bright/25 to-gold/5 text-gold-bright'
                                : 'border-white-8 bg-white/[0.04] text-text-tertiary',
                            )}
                            style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
                            aria-hidden="true"
                          >
                            {spell.level}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-serif text-body text-text">
                            {localize(spell.name)}
                          </span>
                          {isPrepared ? (
                            <span className="flex-shrink-0 rounded-full border border-gold-dim/40 bg-gold/[0.08] px-2 py-0.5 font-title text-[9px] font-bold uppercase tracking-[0.16em] text-gold-bright">
                              {t('sheet.magie.prep.prepared')}
                            </span>
                          ) : !blocked ? (
                            <Icon name="i-plus" className="h-4 w-4 flex-shrink-0 text-text-faint" />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function groupByLevel(spells: readonly Spell[]): Array<[number, Spell[]]> {
  const map = new Map<number, Spell[]>();
  for (const s of spells) {
    const arr = map.get(s.level) ?? [];
    arr.push(s);
    map.set(s.level, arr);
  }
  return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
}
