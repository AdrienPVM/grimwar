import { useMemo, useState, type JSX } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';
import type { Ancestry } from '@/shared/types/content';

import { ANCESTRY_HELP } from '../help/ancestry-help';
import { HelpPanel, StepIntro } from '../help/help-panel';
import { HelpTriggerButton } from '../help/help-trigger-button';
import { ListWithHelpPanel } from '../help/list-with-help-panel';

export function AncestryStep(): JSX.Element {
  const draft = useWizardStore((s) => s.draft);
  const setField = useWizardStore((s) => s.setField);

  const ancestries = useContent('ancestries');

  // Sélection persistante du panneau desktop (UAT post-plan 05). Ne se vide
  // jamais sur mouseleave/blur — bascule uniquement quand un autre item
  // devient actif.
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [modalId, setModalId] = useState<string | null>(null);

  const previewAncestry: Ancestry | null = useMemo(() => {
    const id = previewId ?? draft.ancestryId;
    return id ? (ancestries.data.find((a) => a.id === id) ?? null) : null;
  }, [previewId, draft.ancestryId, ancestries.data]);

  const modalAncestry: Ancestry | null = useMemo(() => {
    if (!modalId) return null;
    return ancestries.data.find((a) => a.id === modalId) ?? null;
  }, [modalId, ancestries.data]);

  return (
    <section className="flex flex-col gap-6">
      <StepIntro>{t('wizard.help.ancestry.intro')}</StepIntro>

      <ListWithHelpPanel
        list={
          <ul
            className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
            aria-label={t('wizard.ancestry.list.aria')}
          >
            {ancestries.data.map((a) => {
              const selected = draft.ancestryId === a.id;
              const name = localize(a.name);
              return (
                <li key={a.id} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setField('ancestryId', a.id);
                      // Sous-choix d'ascendance niveau 1 (Drakéide / Tieffelin /
                      // Elfe / Gnome / Goliath / Humain) sont posés par les
                      // sous-étapes 13.8. À 13.7, ce step pose seulement
                      // l'ancestryId — `ancestrySubChoices` reste en sentinelle.
                      setPreviewId(a.id);
                    }}
                    onMouseEnter={() => setPreviewId(a.id)}
                    onFocus={() => setPreviewId(a.id)}
                    className={cn(
                      'group flex w-full min-h-[68px] flex-col items-start gap-1 rounded-card border p-3 pr-12 text-left transition-all',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40',
                      selected
                        ? 'border-gold-bright bg-gold-bright/10 shadow-gold-glow'
                        : 'border-soft bg-bg-3/30 hover:border-glow hover:bg-bg-3/50',
                    )}
                    aria-pressed={selected}
                  >
                    <span className="font-display text-[15px] text-gold-bright">
                      {name}
                    </span>
                    <span className="font-serif text-[12px] text-text-tertiary">
                      {ANCESTRY_HELP[a.id]?.tagline ?? ''}
                    </span>
                  </button>
                  <HelpTriggerButton
                    ariaLabel={`${t('wizard.helpPanel.viewDetail')} · ${name}`}
                    onClick={() => setModalId(a.id)}
                    className="absolute top-2 right-2"
                  />
                </li>
              );
            })}
          </ul>
        }
        panel={
          previewAncestry ? (
            <HelpPanel
              title={localize(previewAncestry.name)}
              tagline={ANCESTRY_HELP[previewAncestry.id]?.tagline}
              whyChoose={ANCESTRY_HELP[previewAncestry.id]?.whyChoose}
              inGame={ANCESTRY_HELP[previewAncestry.id]?.inGame}
              difficulty={ANCESTRY_HELP[previewAncestry.id]?.difficulty}
            />
          ) : null
        }
      />

      <DetailModal
        open={modalAncestry !== null}
        onClose={() => setModalId(null)}
        titleId="ancestry-detail-modal-title"
        closeLabel={t('wizard.helpPanel.close')}
      >
        {modalAncestry ? (
          <div className="p-4 sm:p-5">
            <HelpPanel
              title={localize(modalAncestry.name)}
              tagline={ANCESTRY_HELP[modalAncestry.id]?.tagline}
              whyChoose={ANCESTRY_HELP[modalAncestry.id]?.whyChoose}
              inGame={ANCESTRY_HELP[modalAncestry.id]?.inGame}
              difficulty={ANCESTRY_HELP[modalAncestry.id]?.difficulty}
              headingId="ancestry-detail-modal-title"
            />
          </div>
        ) : null}
      </DetailModal>
    </section>
  );
}
