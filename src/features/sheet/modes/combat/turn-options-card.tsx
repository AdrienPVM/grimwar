import { useMemo, type JSX } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { Icon } from '@/shared/components/icon';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import { classifyCastingTime } from '@/shared/lib/rules/casting-time';
import type { Character } from '@/shared/types/character';

interface TurnOptionsCardProps {
  character: Character;
  /** Bascule vers le mode Magie, où le sort se lance réellement. */
  onOpenMagie: () => void;
}

/**
 * Ce que ce personnage peut jouer EN DEHORS de son action.
 *
 * POURQUOI CETTE CARTE : la liste d'attaques, juste au-dessus, couvre déjà
 * l'évidence — « je frappe ». Ce qu'un joueur oublie une campagne entière, ce
 * sont son action Bonus et sa Réaction : elles ne coûtent rien, elles ne
 * s'épuisent pas si on ne s'en sert pas, et rien à l'écran ne rappelait qu'on
 * en avait. Un Occultiste qui n'a jamais joué Marque du chasseur au bon moment,
 * ce n'est pas un problème de règles, c'est un problème d'affichage.
 *
 * POURQUOI PAS UN ONGLET « ACTIONS » COMPLET (façon D&D Beyond) : lister aussi
 * les 240 sorts à l'action recopierait le mode Magie dans le mode Combat. Le
 * volume noierait exactement ce qu'on cherche à faire remonter. On ne montre
 * donc que la part rare.
 *
 * PORTÉE ASSUMÉE : la carte RAPPELLE, elle ne lance pas. Un tap bascule vers le
 * mode Magie, où vit toute la mécanique d'incantation (emplacements,
 * concentration, source d'ascendance, pacte). Dupliquer ce câblage ici pour
 * gagner un tap aurait fabriqué un second chemin d'incantation à maintenir.
 *
 * SOURCES : les sorts viennent du bundle SRD via le temps d'incantation
 * (`classifyCastingTime`). L'attaque d'Opportunité est ajoutée en dur parce que
 * tout le monde l'a et qu'elle ne dépend d'aucune donnée de personnage —
 * terme repris tel quel du SRD FR 5.2.1 (« attaque d'Opportunité »).
 */
export function TurnOptionsCard({ character, onOpenMagie }: TurnOptionsCardProps): JSX.Element {
  const { data: spells } = useContent('spells');

  const { bonus, reaction } = useMemo(() => {
    // Toutes les origines de sorts du personnage confondues : classes, ascendance,
    // pacte. `knownSpells` et `preparedSpells` sont des Record<source, slug[]>,
    // donc `Object.values` couvre les sources futures sans y revenir.
    const owned = new Set<string>([
      ...Object.values(character.knownSpells).flat(),
      ...Object.values(character.preparedSpells).flat(),
    ]);
    if (owned.size === 0) return { bonus: [], reaction: [] };

    const bonusSpells: { id: string; name: string }[] = [];
    const reactionSpells: { id: string; name: string }[] = [];
    for (const spell of spells) {
      const id = spell.id;
      if (id === undefined || !owned.has(id)) continue;
      // `en` est optionnel au schéma (un pack maison peut n'avoir que le FR).
      // Sans temps d'incantation anglais, on ne classe pas plutôt que de
      // deviner : une entrée mal rangée ferait promettre une action Bonus qui
      // n'existe pas.
      const castingTimeEn = spell.castingTime.en;
      if (castingTimeEn === undefined) continue;
      const economy = classifyCastingTime(castingTimeEn);
      if (economy === 'bonus') bonusSpells.push({ id, name: localize(spell.name) });
      else if (economy === 'reaction') reactionSpells.push({ id, name: localize(spell.name) });
    }
    const byName = (a: { name: string }, b: { name: string }): number =>
      a.name.localeCompare(b.name, 'fr');
    return { bonus: bonusSpells.sort(byName), reaction: reactionSpells.sort(byName) };
  }, [character.knownSpells, character.preparedSpells, spells]);

  return (
    <Card>
      <CardHeader>
        <h3>{t('sheet.turnOptions.title')}</h3>
      </CardHeader>

      <p className="mb-3 font-serif text-[12px] italic text-text-tertiary">
        {t('sheet.turnOptions.hint')}
      </p>

      <Section
        icon="i-flame"
        label={t('sheet.turnOptions.bonus')}
        entries={bonus}
        emptyLabel={t('sheet.turnOptions.bonus.empty')}
        onSelect={onOpenMagie}
      />
      <Section
        icon="i-shield"
        label={t('sheet.turnOptions.reaction')}
        // L'attaque d'Opportunité ouvre systématiquement la section : c'est la
        // Réaction que tout le monde possède, et celle qu'on oublie le plus.
        entries={[{ id: 'opportunity-attack', name: t('sheet.turnOptions.opportunityAttack') }, ...reaction]}
        emptyLabel={null}
        onSelect={onOpenMagie}
        // Seuls les sorts mènent au mode Magie ; l'entrée de règle est inerte.
        inertIds={['opportunity-attack']}
        className="mt-4"
      />
    </Card>
  );
}

function Section({
  icon,
  label,
  entries,
  emptyLabel,
  onSelect,
  inertIds = [],
  className,
}: {
  icon: 'i-flame' | 'i-shield';
  label: string;
  entries: readonly { id: string; name: string }[];
  emptyLabel: string | null;
  onSelect: () => void;
  inertIds?: readonly string[];
  className?: string;
}): JSX.Element {
  return (
    <section className={className}>
      <h4 className="mb-2 flex items-center gap-2 font-title text-meta uppercase tracking-[0.18em] text-gold-text">
        <Icon name={icon} className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </h4>
      {entries.length === 0 ? (
        emptyLabel === null ? null : (
          <p className="font-serif text-[12px] italic text-text-faint">{emptyLabel}</p>
        )
      ) : (
        <ul className="flex flex-wrap gap-2">
          {entries.map((entry) => {
            const inert = inertIds.includes(entry.id);
            return (
              <li key={entry.id}>
                {inert ? (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-pill border border-white-8 bg-white/[0.03] px-3 py-1.5',
                      'font-ui text-[12px] text-text-secondary',
                    )}
                  >
                    {entry.name}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={onSelect}
                    className={cn(
                      'inline-flex items-center rounded-pill border border-soft bg-white/[0.04] px-3 py-1.5',
                      'font-ui text-[12px] text-text-default',
                      'transition-all duration-200 ease-base hover:-translate-y-px hover:border-gold-dim/70 hover:text-gold-bright',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40',
                    )}
                  >
                    {entry.name}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
