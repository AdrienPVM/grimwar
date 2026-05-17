import { useMemo, useState, type JSX } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';
import { FormField, TextInput } from '@/shared/components/form';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';
import type { Background } from '@/shared/types/content';

import { BACKGROUND_HELP } from '../help/background-help';
import { HelpPanel, StepIntro } from '../help/help-panel';
import { HelpTriggerButton } from '../help/help-trigger-button';
import { ListWithHelpPanel } from '../help/list-with-help-panel';

export function BackgroundStep(): JSX.Element {
  const draft = useWizardStore((s) => s.draft);
  const setField = useWizardStore((s) => s.setField);
  const setPersonality = useWizardStore((s) => s.setPersonality);

  const backgrounds = useContent('backgrounds');
  // Sélection persistante (UAT post-plan 05) : ne se vide pas sur mouseleave.
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [modalId, setModalId] = useState<string | null>(null);

  const preview: Background | null = useMemo(() => {
    const id = previewId ?? draft.backgroundId;
    return id ? (backgrounds.data.find((b) => b.id === id) ?? null) : null;
  }, [previewId, draft.backgroundId, backgrounds.data]);

  const modal: Background | null = useMemo(() => {
    if (!modalId) return null;
    return backgrounds.data.find((b) => b.id === modalId) ?? null;
  }, [modalId, backgrounds.data]);

  return (
    <section className="flex flex-col gap-6">
      <StepIntro>{t('wizard.help.background.intro')}</StepIntro>

      <ListWithHelpPanel
        list={
          <ul
            className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
            aria-label={t('wizard.background.list.aria')}
          >
            {backgrounds.data.map((b) => {
              const selected = draft.backgroundId === b.id;
              const name = localize(b.name);
              return (
                <li key={b.id} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setField('backgroundId', b.id);
                      setPreviewId(b.id);
                    }}
                    onMouseEnter={() => setPreviewId(b.id)}
                    onFocus={() => setPreviewId(b.id)}
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
                      {BACKGROUND_HELP[b.id]?.tagline ?? ''}
                    </span>
                  </button>
                  <HelpTriggerButton
                    ariaLabel={`${t('wizard.helpPanel.viewDetail')} · ${name}`}
                    onClick={() => setModalId(b.id)}
                    className="absolute top-2 right-2"
                  />
                </li>
              );
            })}
          </ul>
        }
        panel={
          preview ? (
            <HelpPanel
              title={localize(preview.name)}
              tagline={BACKGROUND_HELP[preview.id]?.tagline}
              whyChoose={BACKGROUND_HELP[preview.id]?.whyChoose}
              inGame={BACKGROUND_HELP[preview.id]?.inGame}
              difficulty={BACKGROUND_HELP[preview.id]?.difficulty}
            />
          ) : null
        }
      />

      <DetailModal
        open={modal !== null}
        onClose={() => setModalId(null)}
        titleId="background-detail-modal-title"
        closeLabel={t('wizard.helpPanel.close')}
      >
        {modal ? (
          <div className="p-4 sm:p-5">
            <HelpPanel
              title={localize(modal.name)}
              tagline={BACKGROUND_HELP[modal.id]?.tagline}
              whyChoose={BACKGROUND_HELP[modal.id]?.whyChoose}
              inGame={BACKGROUND_HELP[modal.id]?.inGame}
              difficulty={BACKGROUND_HELP[modal.id]?.difficulty}
              headingId="background-detail-modal-title"
            />
          </div>
        ) : null}
      </DetailModal>

      {draft.backgroundId ? (
        <div className="flex flex-col gap-4 rounded-card border border-soft bg-bg-3/30 p-4">
          <p className="font-title text-meta uppercase tracking-[0.18em] text-gold-bright">
            {t('wizard.background.personality')}
          </p>
          <p className="font-serif text-[13px] text-text-secondary">
            {t('wizard.help.background.personalityIntro')}
          </p>

          <FormField label={t('wizard.field.trait')}>
            {(p) => (
              <TextInput
                {...p}
                value={draft.personality.trait}
                onChange={(e) => setPersonality({ trait: e.target.value })}
                maxLength={120}
              />
            )}
          </FormField>
          <FormField label={t('wizard.field.ideal')}>
            {(p) => (
              <TextInput
                {...p}
                value={draft.personality.ideal}
                onChange={(e) => setPersonality({ ideal: e.target.value })}
                maxLength={120}
              />
            )}
          </FormField>
          <FormField label={t('wizard.field.bond')}>
            {(p) => (
              <TextInput
                {...p}
                value={draft.personality.bond}
                onChange={(e) => setPersonality({ bond: e.target.value })}
                maxLength={120}
              />
            )}
          </FormField>
          <FormField label={t('wizard.field.flaw')}>
            {(p) => (
              <TextInput
                {...p}
                value={draft.personality.flaw}
                onChange={(e) => setPersonality({ flaw: e.target.value })}
                maxLength={120}
              />
            )}
          </FormField>
        </div>
      ) : null}
    </section>
  );
}
