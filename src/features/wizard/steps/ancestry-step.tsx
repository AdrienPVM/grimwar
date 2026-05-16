import { useMemo, useState, type JSX } from 'react';

import { Select } from '@/shared/components/form';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';
import type { Ancestry } from '@/shared/types/content';

import { ANCESTRY_HELP } from '../help/ancestry-help';
import { HelpPanel, StepIntro } from '../help/help-panel';

export function AncestryStep(): JSX.Element {
  const draft = useWizardStore((s) => s.draft);
  const setField = useWizardStore((s) => s.setField);

  const ancestries = useContent('ancestries');
  const subancestries = useContent('subancestries');

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const focusedAncestry: Ancestry | null = useMemo(() => {
    const id = hoveredId ?? draft.ancestryId;
    return id ? (ancestries.data.find((a) => a.id === id) ?? null) : null;
  }, [hoveredId, draft.ancestryId, ancestries.data]);

  const subOptions = useMemo(() => {
    if (!draft.ancestryId) return [];
    return subancestries.data.filter((sa) => sa.ancestryId === draft.ancestryId);
  }, [draft.ancestryId, subancestries.data]);

  return (
    <section className="flex flex-col gap-6">
      <StepIntro>{t('wizard.help.ancestry.intro')}</StepIntro>

      <div className="grid gap-6 md:grid-cols-[1fr_minmax(0,360px)]">
        <ul
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
          aria-label={t('wizard.ancestry.list.aria')}
        >
          {ancestries.data.map((a) => {
            const selected = draft.ancestryId === a.id;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    setField('ancestryId', a.id);
                    setField('subancestryId', null);
                  }}
                  onMouseEnter={() => setHoveredId(a.id)}
                  onFocus={() => setHoveredId(a.id)}
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
                    {localize(a.name)}
                  </span>
                  <span className="font-serif text-[12px] text-text-tertiary">
                    {ANCESTRY_HELP[a.id]?.tagline ?? ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {focusedAncestry ? (
          <HelpPanel
            title={localize(focusedAncestry.name)}
            tagline={ANCESTRY_HELP[focusedAncestry.id]?.tagline}
            whyChoose={ANCESTRY_HELP[focusedAncestry.id]?.whyChoose}
            inGame={ANCESTRY_HELP[focusedAncestry.id]?.inGame}
            difficulty={ANCESTRY_HELP[focusedAncestry.id]?.difficulty}
          />
        ) : null}
      </div>

      {subOptions.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('wizard.field.subancestry')}
          </p>
          <Select
            placeholder={t('wizard.placeholder.choose')}
            value={draft.subancestryId ?? ''}
            onChange={(e) => setField('subancestryId', e.target.value || null)}
            options={subOptions.map((sa) => ({
              value: sa.id,
              label: localize(sa.name),
            }))}
            aria-label={t('wizard.field.subancestry')}
          />
        </div>
      ) : null}
    </section>
  );
}
