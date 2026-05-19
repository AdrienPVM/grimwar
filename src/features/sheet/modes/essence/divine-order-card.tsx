import { useMemo, useState } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { localize } from '@/shared/lib/i18n';
import type { Character, DivineOrder } from '@/shared/types/character';

import { OrderDetailModal } from './order-detail-modal';

interface DivineOrderCardProps {
  character: Character;
}

/**
 * Carte « Ordre divin » du Clerc (plan 13.9 commit 4b → 4c cliquable).
 *
 * Lue depuis la première entrée Clerc de `character.classes` (multi-class :
 * un perso peut avoir Clerc en classe secondaire, on rend quand même la
 * carte). Le contenu (nom FR + summary FR) vient du bundle
 * `classes.json[cleric].divineOrders[*]` — JAMAIS de constantes in-file.
 *
 * Cat. 5 (cohérence wizard → fiche, politique « Vérité du contenu »
 * 2026-05-19) : le slug `protector` posé au wizard rend EXACTEMENT
 * « Protecteur » + le summary du bundle, JAMAIS celui de l'autre ordre.
 *
 * Plan 13.9 commit 4c — la carte devient un bouton qui ouvre une modale
 * détail (décision Adrien UAT 4b : cohérence d'interaction avec sorts +
 * armes, où un tap ouvre toujours un détail).
 */
export function DivineOrderCard({ character }: DivineOrderCardProps): JSX.Element | null {
  const { data: classes } = useContent('classes');
  const [open, setOpen] = useState<boolean>(false);
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
  const ariaLabel = `Ordre divin : ${name}`;

  return (
    <Card>
      <CardHeader>
        <h3>Ordre divin</h3>
      </CardHeader>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        className="flex w-full flex-col gap-2 rounded-card-sm border border-gold-dim/30 bg-gradient-to-b from-gold-bright/[0.06] to-gold/[0.02] p-4 text-left transition-all duration-200 ease-base hover:-translate-y-px hover:border-gold-dim/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40"
      >
        <span className="font-display text-[16px] text-gold-bright">{name}</span>
        <p className="font-serif text-[13px] text-text-secondary">{summary}</p>
      </button>
      <OrderDetailModal
        open={open}
        onClose={() => setOpen(false)}
        kindLabel="Ordre divin"
        name={name}
        summary={summary}
      />
    </Card>
  );
}
