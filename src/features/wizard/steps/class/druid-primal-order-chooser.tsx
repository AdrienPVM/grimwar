import { useMemo, type JSX } from 'react';

import { RadioCardGroup, type RadioCardOption } from '@/shared/components/form';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { ChooserMissingDataBanner } from '../chooser-missing-data-banner';

import { asPrimalOrder } from './chooser-utils';

/**
 * Chooser Druide — Ordre primordial (Magicien vs Gardien — SRD 5.2.1).
 *
 * Source : `public/data/classes.json > druid.primalOrders`. Magicien =
 * druide-sorcier (cantrip + bonus tests INT) ; Gardien = druide-protecteur
 * (armes martiales + armure intermédiaire en cuir/cuir clouté/écailles).
 */
export function DruidPrimalOrderChooser(): JSX.Element {
  const classes = useContent('classes');
  const setClassSubChoice = useWizardStore((s) => s.setClassSubChoice);
  const entry = useWizardStore((s) =>
    s.draft.classes.find((c) => c.classId === 'druid') ?? null,
  );

  const options = useMemo<ReadonlyArray<RadioCardOption<string>>>(() => {
    const druid = classes.data.find((c) => c.id === 'druid');
    const list = druid?.primalOrders ?? [];
    return list.map((o) => ({
      value: o.id,
      title: localize(o.name),
      mechanicalImpact: localize(o.summary),
    }));
  }, [classes.data]);

  if (options.length === 0)
    return <ChooserMissingDataBanner chooserKey="druid-primal-order" contentType="classes" />;

  return (
    <div className="flex flex-col gap-4">
      <RadioCardGroup
        legend={t('wizard.subchoice.primalOrder.legend')}
        helper={t('wizard.subchoice.primalOrder.helper')}
        name="classSubChoice-druid-primal-order"
        value={entry?.druidPrimalOrder ?? null}
        onValueChange={(next) => {
          const parsed = asPrimalOrder(next);
          if (!parsed) return;
          setClassSubChoice('druid', 'druidPrimalOrder', parsed);
        }}
        options={options}
        columns={2}
      />
    </div>
  );
}
