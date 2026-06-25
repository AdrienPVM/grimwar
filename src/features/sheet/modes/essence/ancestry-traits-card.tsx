import { useMemo, useState, type JSX } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';
import type { I18nString } from '@/shared/lib/i18n';

import { OrderDetailModal } from './order-detail-modal';

interface AncestryTraitsCardProps {
  character: Character;
}

interface ResolvedTrait {
  /** Clé stable de rendu / d'ouverture de modale (nom FR du trait). */
  key: string;
  name: I18nString;
  description: I18nString;
}

/**
 * Carte « Traits d'ascendance » du mode Essence.
 *
 * Les traits communs de l'espèce (`ancestries.json[id].traits[]` — ex. Vision
 * dans le noir, Ascendance féerique, Transe…) étaient stockés dans le bundle
 * mais surfacés NULLE PART sur la fiche (seuls le Souffle draconique et
 * l'Ascendance gigante avaient leur carte dédiée en Combat). Cette carte les
 * liste tous, chacun cliquable → détail (cohérence « un tap = un détail », cf.
 * `<InvocationsCard>` / `<DivineOrderCard>`).
 *
 * Contenu dérivé du bundle (JAMAIS de constante in-file) ; le nom + la
 * description sont les champs `name.fr` / `description.fr` exacts de l'entrée.
 * Réutilise le terme projet « ascendance » (i18n `wizard.step.ancestry.title`).
 *
 * Disparaît (null) si l'ascendance n'est pas résolue ou ne porte aucun trait.
 */
export function AncestryTraitsCard({ character }: AncestryTraitsCardProps): JSX.Element | null {
  const { data: ancestries } = useContent('ancestries');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const traits = useMemo<ResolvedTrait[]>(() => {
    const ancestry = ancestries.find((a) => a.id === character.ancestryId);
    if (!ancestry) return [];
    return ancestry.traits.map((trait) => ({
      key: trait.name.fr,
      name: trait.name,
      description: trait.description,
    }));
  }, [ancestries, character.ancestryId]);

  if (traits.length === 0) return null;

  const opened = openKey ? traits.find((tr) => tr.key === openKey) ?? null : null;

  return (
    <Card>
      <CardHeader>
        <h3>{t('sheet.essence.ancestryTraits.title')}</h3>
      </CardHeader>
      <ul className="flex flex-col gap-2">
        {traits.map((trait) => {
          const name = localize(trait.name);
          const description = localize(trait.description);
          const ariaLabel = t('sheet.essence.ancestryTraits.openLabel').replace('{name}', name);
          return (
            <li key={trait.key}>
              <button
                type="button"
                onClick={() => setOpenKey(trait.key)}
                aria-label={ariaLabel}
                aria-haspopup="dialog"
                className="flex w-full flex-col gap-1.5 rounded-card-sm border border-gold-dim/30 bg-gradient-to-b from-gold-bright/[0.06] to-gold/[0.02] p-4 text-left transition-all duration-200 ease-base hover:-translate-y-px hover:border-gold-dim/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40"
              >
                <span className="font-display text-[16px] text-gold-bright">{name}</span>
                <p className="line-clamp-2 font-serif text-[13px] text-text-secondary">
                  {description}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
      <OrderDetailModal
        open={opened !== null}
        onClose={() => setOpenKey(null)}
        kindLabel={t('sheet.essence.ancestryTraits.title')}
        name={opened ? localize(opened.name) : ''}
        summary={opened ? localize(opened.description) : ''}
      />
    </Card>
  );
}
