import { useMemo, type JSX } from 'react';

import { RadioCardGroup, type RadioCardOption } from '@/shared/components/form';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { ChooserMissingDataBanner } from '../chooser-missing-data-banner';

import { asDivineOrder } from './chooser-utils';

/**
 * Chooser Clerc — Ordre divin (Protecteur vs Thaumaturge — SRD 5.2.1).
 *
 * Source : `public/data/classes.json > cleric.divineOrders`. Chaque carte
 * affiche le nom de l'ordre + un impact mécanique court (armure lourde +
 * armes de guerre pour Protecteur / cantrip + bonus INT pour Thaumaturge).
 */
export function ClericDivineOrderChooser(): JSX.Element {
  const classes = useContent('classes');
  const setClassSubChoice = useWizardStore((s) => s.setClassSubChoice);
  const entry = useWizardStore((s) =>
    s.draft.classes.find((c) => c.classId === 'cleric') ?? null,
  );

  const options = useMemo<ReadonlyArray<RadioCardOption<string>>>(() => {
    const cleric = classes.data.find((c) => c.id === 'cleric');
    const list = cleric?.divineOrders ?? [];
    return list.map((o) => ({
      value: o.id,
      title: localize(o.name),
      mechanicalImpact: localize(o.summary),
    }));
  }, [classes.data]);

  if (options.length === 0)
    return <ChooserMissingDataBanner chooserKey="cleric-divine-order" contentType="classes" />;

  return (
    <div className="flex flex-col gap-4">
      <RadioCardGroup
        legend={t('wizard.subchoice.divineOrder.legend')}
        helper={t('wizard.subchoice.divineOrder.helper')}
        name="classSubChoice-cleric-divine-order"
        value={entry?.clericDivineOrder ?? null}
        onValueChange={(next) => {
          const parsed = asDivineOrder(next);
          if (!parsed) return;
          setClassSubChoice('cleric', 'clericDivineOrder', parsed);
        }}
        options={options}
        columns={2}
      />
    </div>
  );
}
