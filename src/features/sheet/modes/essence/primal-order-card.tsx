import { useMemo } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { localize } from '@/shared/lib/i18n';
import type { Character, PrimalOrder } from '@/shared/types/character';

interface PrimalOrderCardProps {
  character: Character;
}

/**
 * Carte « Ordre primordial » du Druide (plan 13.9 commit 4b).
 *
 * Lue depuis la première entrée Druide de `character.classes`. Le contenu
 * (nom FR + summary FR) vient du bundle `classes.json[druid].primalOrders[*]`.
 *
 * Cat. 5 (cohérence wizard → fiche, politique « Vérité du contenu »
 * 2026-05-19) : le slug `magician` posé au wizard rend EXACTEMENT « Mage »
 * + le summary du bundle, JAMAIS celui de l'autre ordre.
 */
export function PrimalOrderCard({ character }: PrimalOrderCardProps): JSX.Element | null {
  const { data: classes } = useContent('classes');
  const order = useMemo<PrimalOrder | null>(() => {
    const druidEntry = character.classes.find((c) => c.classId === 'druid');
    return druidEntry?.druidPrimalOrder ?? null;
  }, [character.classes]);

  const orderEntry = useMemo(() => {
    if (!order) return null;
    const druid = classes.find((c) => c.id === 'druid');
    const primalOrders =
      (druid as unknown as { primalOrders?: Array<{ id: string; name: { fr: string; en?: string }; summary: { fr: string; en?: string } }> })
        ?.primalOrders ?? [];
    return primalOrders.find((o) => o.id === order) ?? null;
  }, [classes, order]);

  if (!orderEntry) return null;

  const name = localize(orderEntry.name);
  const summary = localize(orderEntry.summary);

  return (
    <Card>
      <CardHeader>
        <h3>Ordre primordial</h3>
      </CardHeader>
      <div
        className="flex flex-col gap-2 rounded-card-sm border border-gold-dim/30 bg-gradient-to-b from-gold-bright/[0.06] to-gold/[0.02] p-4"
        aria-label={`Ordre primordial : ${name}`}
      >
        <span className="font-display text-[16px] text-gold-bright">{name}</span>
        <p className="font-serif text-[13px] text-text-secondary">{summary}</p>
      </div>
    </Card>
  );
}
