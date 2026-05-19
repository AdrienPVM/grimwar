import { useMemo, useState, type JSX } from 'react';

import { RadioCardGroup, type RadioCardOption } from '@/shared/components/form';
import { DetailModal } from '@/shared/components/detail-modal';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { DIVINE_ORDER_HELP } from '../../help/divine-order-help';
import { HelpTriggerButton } from '../../help/help-trigger-button';
import { ChooserMissingDataBanner } from '../chooser-missing-data-banner';

import { ClassChooserHelpPanel } from './class-chooser-help-panel';
import { asDivineOrder } from './chooser-utils';

/**
 * Chooser Clerc — Ordre divin (Protecteur vs Thaumaturge — SRD 5.2.1).
 *
 * Source : `public/data/classes.json > cleric.divineOrders`. Chaque carte
 * affiche le nom de l'ordre + un impact mécanique court (armure lourde +
 * armes de guerre pour Protecteur / cantrip + bonus INT pour Thaumaturge).
 *
 * Bouton « ? » par option (correctif UAT 2026-05-19 Bug A) : sans le `?`,
 * le panneau d'aide n'apparaît qu'APRÈS sélection — pré-consult impossible.
 */
export function ClericDivineOrderChooser(): JSX.Element {
  const classes = useContent('classes');
  const setClassSubChoice = useWizardStore((s) => s.setClassSubChoice);
  const entry = useWizardStore((s) =>
    s.draft.classes.find((c) => c.classId === 'cleric') ?? null,
  );

  const [modalOrderId, setModalOrderId] = useState<string | null>(null);

  const orders = useMemo(() => {
    const cleric = classes.data.find((c) => c.id === 'cleric');
    return cleric?.divineOrders ?? [];
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
    return <ChooserMissingDataBanner chooserKey="cleric-divine-order" contentType="classes" />;

  const value = entry?.clericDivineOrder ?? null;
  const selectedOption = value ? options.find((o) => o.value === value) ?? null : null;
  const selectedTitle = selectedOption ? String(selectedOption.title) : '';

  const modalOrder = modalOrderId
    ? orders.find((o) => o.id === modalOrderId) ?? null
    : null;
  const modalEntry =
    modalOrderId && modalOrderId in DIVINE_ORDER_HELP
      ? DIVINE_ORDER_HELP[modalOrderId as keyof typeof DIVINE_ORDER_HELP]
      : null;

  return (
    <div className="flex flex-col gap-4">
      <RadioCardGroup
        legend={t('wizard.subchoice.divineOrder.legend')}
        helper={t('wizard.subchoice.divineOrder.helper')}
        name="classSubChoice-cleric-divine-order"
        value={value}
        onValueChange={(next) => {
          const parsed = asDivineOrder(next);
          if (!parsed) return;
          setClassSubChoice('cleric', 'clericDivineOrder', parsed);
        }}
        options={options}
        columns={2}
      />
      <ClassChooserHelpPanel
        title={selectedTitle}
        entry={value ? DIVINE_ORDER_HELP[value] : undefined}
      />
      <DetailModal
        open={modalOrder !== null && modalEntry !== null}
        onClose={() => setModalOrderId(null)}
        titleId="cleric-divine-order-detail-modal-title"
        closeLabel={t('wizard.helpPanel.close')}
      >
        {modalOrder && modalEntry ? (
          <div className="p-4 sm:p-5">
            <ClassChooserHelpPanel
              title={localize(modalOrder.name)}
              entry={modalEntry}
              headingId="cleric-divine-order-detail-modal-title"
            />
          </div>
        ) : null}
      </DetailModal>
    </div>
  );
}
