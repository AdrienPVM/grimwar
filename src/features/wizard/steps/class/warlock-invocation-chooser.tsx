import { useMemo, useState, type JSX } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';
import { cn } from '@/shared/lib/cn';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';
import type { Invocation } from '@/shared/types/content';

import { ChooserMissingDataBanner } from '../chooser-missing-data-banner';
import { ELDRITCH_INVOCATION_HELP } from '../../help/eldritch-invocation-help';
import { HelpPanel } from '../../help/help-panel';
import { HelpTriggerButton } from '../../help/help-trigger-button';
import { ListWithHelpPanel } from '../../help/list-with-help-panel';

import { toggleBoundedSelection } from './chooser-utils';
import { WARLOCK_INVOCATIONS_COUNT_L1 } from './use-class-sub-choices';

/**
 * Chooser Occultiste — Invocation occulte (Eldritch Invocation — SRD 5.2.1).
 *
 * Source : `public/data/invocations.json` filtré sur `prerequisiteWarlockLevel
 * === null` → 5 invocations éligibles L1 (Armor of Shadows, Eldritch Mind,
 * Pact of the Blade, Pact of the Chain, Pact of the Tome).
 *
 * SRD 2024 : Warlock L1 reçoit 1 invocation. Le composant impose `count = 1`
 * via `WARLOCK_INVOCATIONS_COUNT_L1`.
 */
export function WarlockInvocationChooser(): JSX.Element {
  const invocations = useContent('invocations');
  const setClassSubChoice = useWizardStore((s) => s.setClassSubChoice);
  const entry = useWizardStore((s) =>
    s.draft.classes.find((c) => c.classId === 'warlock') ?? null,
  );

  const eligible = useMemo(
    () =>
      invocations.data
        .filter((inv) => inv.prerequisiteWarlockLevel === null)
        .sort((a, b) => {
          const an = a.name.fr ?? '';
          const bn = b.name.fr ?? '';
          return an.localeCompare(bn, 'fr');
        }),
    [invocations.data],
  );

  // Modale détail mobile partagée — pattern hérité de `spells-step.tsx`.
  const [modalInvId, setModalInvId] = useState<string | null>(null);
  const modalInv = useMemo<Invocation | null>(() => {
    if (!modalInvId) return null;
    return eligible.find((i) => i.id === modalInvId) ?? null;
  }, [modalInvId, eligible]);

  // Sélection persistante locale pour le panneau desktop (UAT 2026-05-18) :
  // sans cette bascule, le `?` est `md:hidden` et le desktop n'a aucun moyen
  // de lire la fiche complète d'une invocation (nom + pré-requis + résumé).
  const [previewInvId, setPreviewInvId] = useState<string | null>(null);
  const previewInv = useMemo<Invocation | null>(() => {
    if (!previewInvId) return null;
    return eligible.find((i) => i.id === previewInvId) ?? null;
  }, [previewInvId, eligible]);

  if (eligible.length === 0)
    return (
      <ChooserMissingDataBanner
        chooserKey="warlock-invocation"
        contentType="invocations"
      />
    );

  const selected = entry?.eldritchInvocations ?? [];
  const count = WARLOCK_INVOCATIONS_COUNT_L1;
  const reachedCap = selected.length >= count;

  const list = (
    <fieldset className="flex flex-col gap-3 border-0 p-0 m-0">
      <legend className="font-title text-meta text-text-secondary uppercase tracking-[0.16em]">
        {t('wizard.subchoice.eldritchInvocation.legend')}
      </legend>
      <p className="font-serif text-[13px] text-text-tertiary -mt-1">
        {t('wizard.subchoice.eldritchInvocation.helper')}
      </p>
      <p className="font-serif text-[13px] text-text-secondary" aria-live="polite">
        {selected.length} / {count}
      </p>
      <div
        role="group"
        aria-label={t('wizard.subchoice.eldritchInvocation.legend')}
        className="grid gap-2.5 grid-cols-1"
      >
        {eligible.map((inv) => {
          const checked = selected.includes(inv.id);
          const disabled = !checked && reachedCap;
          const name = localize(inv.name);
          return (
            <div
              key={inv.id}
              className="relative"
              onMouseEnter={() => setPreviewInvId(inv.id)}
              onFocus={() => setPreviewInvId(inv.id)}
            >
              <label
                htmlFor={`warlock-invocation-${inv.id}`}
                className={cn(
                  'group relative flex min-h-[68px] cursor-pointer flex-col gap-1 rounded-card border p-3 pr-12',
                  'transition-all duration-150 ease-base',
                  'focus-within:ring-2 focus-within:ring-gold-bright/40',
                  checked
                    ? 'border-gold-bright bg-gold-bright/10 shadow-gold-glow'
                    : 'border-soft bg-bg-3/30 hover:border-glow hover:bg-bg-3/50',
                  disabled && 'cursor-not-allowed opacity-40',
                )}
              >
                <input
                  id={`warlock-invocation-${inv.id}`}
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => {
                    const next = toggleBoundedSelection(selected, inv.id, count);
                    setClassSubChoice('warlock', 'eldritchInvocations', next);
                  }}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    'font-display text-[15px]',
                    checked ? 'text-gold-bright' : 'text-gold',
                  )}
                >
                  {name}
                </span>
                <span className="font-serif text-[13px] text-text">
                  {localize(inv.summary)}
                </span>
              </label>
              <HelpTriggerButton
                ariaLabel={`${t('wizard.helpPanel.viewDetail')} · ${name}`}
                onClick={() => setModalInvId(inv.id)}
                className="absolute top-1 right-1"
              />
            </div>
          );
        })}
      </div>

    </fieldset>
  );

  return (
    <>
      <ListWithHelpPanel
        list={list}
        panel={previewInv ? <InvocationHelpPanel invocation={previewInv} /> : null}
        panelKey={previewInv ? `invocation:${previewInv.id}` : undefined}
      />
      <DetailModal
        open={modalInv !== null}
        onClose={() => setModalInvId(null)}
        titleId="warlock-invocation-detail-modal-title"
        closeLabel={t('wizard.helpPanel.close')}
      >
        {modalInv ? (
          <InvocationHelpPanel
            invocation={modalInv}
            headingId="warlock-invocation-detail-modal-title"
          />
        ) : null}
      </DetailModal>
    </>
  );
}

/**
 * Fiche d'une invocation occulte — combine summary du bundle (donnée
 * mécanique autoritaire) et contenu pédagogique (`ELDRITCH_INVOCATION_HELP`).
 *
 * Si le help record n'a pas d'entrée pour cette invocation (cas futur d'une
 * invocation L2+ ouverte par un sort), on retombe sur le summary du bundle
 * seul — pas de placeholder vide.
 */
function InvocationHelpPanel({
  invocation,
  headingId,
}: {
  invocation: Invocation;
  headingId?: string;
}): JSX.Element {
  const help = ELDRITCH_INVOCATION_HELP[invocation.id];
  const name = localize(invocation.name);
  const summary = localize(invocation.summary);
  const prerequisite = invocation.prerequisiteOther
    ? localize(invocation.prerequisiteOther)
    : null;

  if (!help) {
    return (
      <div className="flex flex-col gap-3 rounded-card border border-soft bg-bg-3/30 p-5">
        <h3 id={headingId} className="font-display text-display text-gold-bright">
          {name}
        </h3>
        {prerequisite ? (
          <p className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {prerequisite}
          </p>
        ) : null}
        <p className="font-serif text-body text-text">{summary}</p>
      </div>
    );
  }

  return (
    <HelpPanel
      title={name}
      tagline={help.tagline}
      whyChoose={help.whyChoose}
      inGame={help.inGame}
      difficulty={help.difficulty}
      headingId={headingId}
      extra={
        <div className="flex flex-col gap-2 border-t border-soft pt-3">
          {prerequisite ? (
            <p className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
              {prerequisite}
            </p>
          ) : null}
          <p className="font-serif text-body text-text-secondary">{summary}</p>
        </div>
      }
    />
  );
}
