import { useMemo, useState, type JSX } from 'react';

import { FormField, TextInput } from '@/shared/components/form';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';
import type { Background } from '@/shared/types/content';

import { BACKGROUND_HELP } from '../help/background-help';
import { HelpPanel, StepIntro } from '../help/help-panel';

export function BackgroundStep(): JSX.Element {
  const draft = useWizardStore((s) => s.draft);
  const setField = useWizardStore((s) => s.setField);
  const setPersonality = useWizardStore((s) => s.setPersonality);

  const backgrounds = useContent('backgrounds');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const focused: Background | null = useMemo(() => {
    const id = hoveredId ?? draft.backgroundId;
    return id ? (backgrounds.data.find((b) => b.id === id) ?? null) : null;
  }, [hoveredId, draft.backgroundId, backgrounds.data]);

  return (
    <section className="flex flex-col gap-6">
      <StepIntro>{t('wizard.help.background.intro')}</StepIntro>

      <div className="grid gap-6 md:grid-cols-[1fr_minmax(0,360px)]">
        <ul
          className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
          aria-label={t('wizard.background.list.aria')}
        >
          {backgrounds.data.map((b) => {
            const selected = draft.backgroundId === b.id;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setField('backgroundId', b.id)}
                  onMouseEnter={() => setHoveredId(b.id)}
                  onFocus={() => setHoveredId(b.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={cn(
                    'group flex w-full min-h-[68px] flex-col items-start gap-1 rounded-card border p-3 text-left transition-all',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40',
                    selected
                      ? 'border-gold-bright bg-gold-bright/10 shadow-gold-glow'
                      : 'border-soft bg-bg-3/30 hover:border-glow hover:bg-bg-3/50',
                  )}
                  aria-pressed={selected}
                >
                  <span className="font-display text-[15px] text-gold-bright">
                    {localize(b.name)}
                  </span>
                  <span className="font-serif text-[12px] text-text-tertiary">
                    {BACKGROUND_HELP[b.id]?.tagline ?? ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {focused ? (
          <HelpPanel
            title={localize(focused.name)}
            tagline={BACKGROUND_HELP[focused.id]?.tagline}
            whyChoose={BACKGROUND_HELP[focused.id]?.whyChoose}
            inGame={BACKGROUND_HELP[focused.id]?.inGame}
            difficulty={BACKGROUND_HELP[focused.id]?.difficulty}
          />
        ) : null}
      </div>

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
