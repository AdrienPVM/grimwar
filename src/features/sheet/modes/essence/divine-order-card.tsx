import { useMemo } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { localize } from '@/shared/lib/i18n';
import type { Character, DivineOrder } from '@/shared/types/character';

interface DivineOrderCardProps {
  character: Character;
}

/**
 * Carte « Ordre divin » du Clerc (plan 13.9 commit 4b).
 *
 * Lue depuis la première entrée Clerc de `character.classes` (multi-class :
 * un perso peut avoir Clerc en classe secondaire, on rend quand même la
 * carte). Le contenu (nom FR + summary FR) vient du bundle
 * `classes.json[cleric].divineOrders[*]` — JAMAIS de constantes in-file.
 *
 * Cat. 5 (cohérence wizard → fiche, politique « Vérité du contenu »
 * 2026-05-19) : le slug `protector` posé au wizard rend EXACTEMENT
 * « Protecteur » + le summary du bundle, JAMAIS celui de l'autre ordre.
 */
export function DivineOrderCard({ character }: DivineOrderCardProps): JSX.Element | null {
  const { data: classes } = useContent('classes');
  const order = useMemo<DivineOrder | null>(() => {
    const clericEntry = character.classes.find((c) => c.classId === 'cleric');
    return clericEntry?.clericDivineOrder ?? null;
  }, [character.classes]);

  const orderEntry = useMemo(() => {
    if (!order) return null;
    const cleric = classes.find((c) => c.id === 'cleric');
    const divineOrders =
      (cleric as unknown as { divineOrders?: Array<{ id: string; name: { fr: string; en?: string }; summary: { fr: string; en?: string } }> })
        ?.divineOrders ?? [];
    return divineOrders.find((o) => o.id === order) ?? null;
  }, [classes, order]);

  if (!orderEntry) return null;

  const name = localize(orderEntry.name);
  const summary = localize(orderEntry.summary);

  return (
    <Card>
      <CardHeader>
        <h3>Ordre divin</h3>
      </CardHeader>
      <div
        className="flex flex-col gap-2 rounded-card-sm border border-gold-dim/30 bg-gradient-to-b from-gold-bright/[0.06] to-gold/[0.02] p-4"
        aria-label={`Ordre divin : ${name}`}
      >
        <span className="font-display text-[16px] text-gold-bright">{name}</span>
        <p className="font-serif text-[13px] text-text-secondary">{summary}</p>
      </div>
    </Card>
  );
}
