import { useMemo, useState, type JSX } from 'react';

import { RadioCardGroup, type RadioCardOption } from '@/shared/components/form';
import { DetailModal } from '@/shared/components/detail-modal';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { PRIMAL_ORDER_HELP } from '../../help/primal-order-help';
import { HelpTriggerButton } from '../../help/help-trigger-button';
import { ChooserMissingDataBanner } from '../chooser-missing-data-banner';

import { ClassChooserHelpPanel } from './class-chooser-help-panel';
import { asPrimalOrder } from './chooser-utils';

/**
 * Chooser Druide — Ordre primordial (Magicien vs Gardien — SRD 5.2.1).
 *
 * Source : `public/data/classes.json > druid.primalOrders`. Magicien =
 * druide-sorcier (cantrip + bonus tests INT) ; Gardien = druide-protecteur
 * (armes martiales + armure intermédiaire en cuir/cuir clouté/écailles).
 *
 * Bouton « ? » par option (correctif UAT 2026-05-19 Bug A) : sans le `?`,
 * le panneau d'aide n'apparaît qu'APRÈS sélection — pré-consult impossible.
 */
export function DruidPrimalOrderChooser(): JSX.Element {
  const classes = useContent('classes');
  const setClassSubChoice = useWizardStore((s) => s.setClassSubChoice);
  const entry = useWizardStore((s) =>
    s.draft.classes.find((c) => c.classId === 'druid') ?? null,
  );

  const [modalOrderId, setModalOrderId] = useState<string | null>(null);

  const orders = useMemo(() => {
    const druid = classes.data.find((c) => c.id === 'druid');
    return druid?.primalOrders ?? [];
  }, [classes.data]);

  const options = useMemo<ReadonlyArray<RadioCardOption<string>>>(() => {
    return orders.map((o) => {
      const name = localize(o.name);
      return {
        value: o.id,
        title: name,
        mechanicalImpact: localize(o.summary),
        helpButton: (
          <HelpTriggerButton
            ariaLabel={`${t('wizard.helpPanel.viewDetail')} · ${name}`}
            onClick={() => setModalOrderId(o.id)}
          />
        ),
      };
    });
  }, [orders]);

  if (options.length === 0)
    return <ChooserMissingDataBanner chooserKey="druid-primal-order" contentType="classes" />;

  const value = entry?.druidPrimalOrder ?? null;
  const selectedOption = value ? options.find((o) => o.value === value) ?? null : null;
  const selectedTitle = selectedOption ? String(selectedOption.title) : '';

  const modalOrder = modalOrderId
    ? orders.find((o) => o.id === modalOrderId) ?? null
    : null;
  const modalEntry =
    modalOrderId && modalOrderId in PRIMAL_ORDER_HELP
      ? PRIMAL_ORDER_HELP[modalOrderId as keyof typeof PRIMAL_ORDER_HELP]
      : null;

  return (
    <div className="flex flex-col gap-4">
      <RadioCardGroup
        legend={t('wizard.subchoice.primalOrder.legend')}
        helper={t('wizard.subchoice.primalOrder.helper')}
        name="classSubChoice-druid-primal-order"
        value={value}
        onValueChange={(next) => {
          const parsed = asPrimalOrder(next);
          if (!parsed) return;
          setClassSubChoice('druid', 'druidPrimalOrder', parsed);
        }}
        options={options}
        columns={2}
      />
      <ClassChooserHelpPanel
        title={selectedTitle}
        entry={value ? PRIMAL_ORDER_HELP[value] : undefined}
      />
      <DetailModal
        open={modalOrder !== null && modalEntry !== null}
        onClose={() => setModalOrderId(null)}
        titleId="druid-primal-order-detail-modal-title"
        closeLabel={t('wizard.helpPanel.close')}
      >
        {modalOrder && modalEntry ? (
          <div className="p-4 sm:p-5">
            <ClassChooserHelpPanel
              title={localize(modalOrder.name)}
              entry={modalEntry}
              headingId="druid-primal-order-detail-modal-title"
            />
          </div>
        ) : null}
      </DetailModal>
    </div>
  );
}
