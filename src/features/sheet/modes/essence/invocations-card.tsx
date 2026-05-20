import { useMemo, useState, type JSX } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { localize } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';
import type { Invocation } from '@/shared/types/content';

import { OrderDetailModal } from './order-detail-modal';

interface InvocationsCardProps {
  character: Character;
}

/**
 * Carte « Manifestations occultes » de l'Occultiste (plan 13.9 commit 4e).
 *
 * Parité sémantique avec `<DivineOrderCard>` / `<PrimalOrderCard>` — le mode
 * Essence regroupe les choix d'identité de classe. Une Manifestation occulte
 * (Eldritch Invocation, dénomination D&D 5e FR officielle / Black Book
 * Editions, cf. `wizard.subchoice.eldritchInvocation.legend` posé au wizard)
 * est exactement ce type de choix : signature mécanique permanente du PJ,
 * indépendante d'un slot ou d'une action ponctuelle.
 *
 * Honnêteté sur l'état du système (UAT 4e — argument 2 du tri Adrien) :
 * `pact-of-the-blade` est martial, `pact-of-the-tome` enrichit le grimoire,
 * `pact-of-the-chain` ajoute un familier rituel. Mais l'app L1 ne câble
 * ENCORE aucun moteur d'action/rituel sur ces capacités. Les afficher en
 * Combat / Magie ferait un faux signal d'interaction. L'Essence est le siège
 * canonique tant que l'intégration profonde n'existe pas (cf. DEBT D13 pour
 * `pact-of-the-tome` / `pact-of-the-chain` côté moteur de sorts).
 *
 * Chaque invocation est cliquable → ouvre `<OrderDetailModal>` réutilisée
 * (la modale est volontairement générique malgré son nom — l'API
 * `kindLabel + name + summary` accepte n'importe quel triplet identité).
 * Parité d'interaction avec les Order cards 4c et le SpellDetailModal 4d.
 *
 * Cat. 5 (cohérence wizard → fiche, testing policy 2026-05-19) : le slug
 * posé au wizard rend EXACTEMENT le nom + summary du bundle pour ce slug,
 * JAMAIS celui d'une autre invocation. Cas-limite cat. 6 : multi-invocations
 * (anticipation level-up) — ordre alphabétique stable, pas de duplication.
 *
 * Le titre de la carte « Manifestations occultes » réutilise le terme posé
 * en `wizard.subchoice.eldritchInvocation.legend` (`Manifestation occulte`,
 * singulier), pluralisé pour le header d'une carte qui en liste N. Cohérent
 * avec la terminologie officielle D&D 5e FR (Black Book Editions PHB FR +
 * `content-sources/aidedd/List » Manifestations D&D 5.html`) — pas une
 * invention, pas une mémoire de modèle.
 */
export function InvocationsCard({ character }: InvocationsCardProps): JSX.Element | null {
  const { data: invocations } = useContent('invocations');
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const known = useMemo<Invocation[]>(() => {
    const warlockEntry = character.classes.find((c) => c.classId === 'warlock');
    if (!warlockEntry) return [];
    const slugs = warlockEntry.eldritchInvocations ?? [];
    // Dédoublonnage défensif (Cat. 6 — un seed mal formé ne doit pas
    // produire un double rendu). On garde l'ordre des `slugs` pour la
    // résolution puis on trie par `name.fr` à la sortie.
    const seen = new Set<string>();
    const items: Invocation[] = [];
    for (const slug of slugs) {
      if (seen.has(slug)) continue;
      seen.add(slug);
      const inv = invocations.find((i) => i.id === slug);
      if (inv) items.push(inv);
    }
    return items.sort((a, b) =>
      localize(a.name).localeCompare(localize(b.name), 'fr'),
    );
  }, [character.classes, invocations]);

  if (known.length === 0) return null;

  const opened = openSlug ? known.find((i) => i.id === openSlug) ?? null : null;

  return (
    <Card>
      <CardHeader>
        <h3>Manifestations occultes</h3>
      </CardHeader>
      <ul className="flex flex-col gap-2">
        {known.map((inv) => {
          const name = localize(inv.name);
          const summary = localize(inv.summary);
          const ariaLabel = `Manifestation occulte : ${name}`;
          return (
            <li key={inv.id}>
              <button
                type="button"
                onClick={() => setOpenSlug(inv.id)}
                aria-label={ariaLabel}
                aria-haspopup="dialog"
                className="flex w-full flex-col gap-2 rounded-card-sm border border-gold-dim/30 bg-gradient-to-b from-gold-bright/[0.06] to-gold/[0.02] p-4 text-left transition-all duration-200 ease-base hover:-translate-y-px hover:border-gold-dim/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40"
              >
                <span className="font-display text-[16px] text-gold-bright">
                  {name}
                </span>
                <p className="font-serif text-[13px] text-text-secondary">
                  {summary}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
      <OrderDetailModal
        open={opened !== null}
        onClose={() => setOpenSlug(null)}
        kindLabel="Manifestation occulte"
        name={opened ? localize(opened.name) : ''}
        summary={opened ? localize(opened.summary) : ''}
      />
    </Card>
  );
}
