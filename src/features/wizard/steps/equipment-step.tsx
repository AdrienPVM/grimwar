import { useMemo, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';
import type { ClassEntity, Item } from '@/shared/types/content';

import { applyReferenceEquipment } from '../reference-builds/builds';
import { StepIntro } from '../help/help-panel';

/**
 * Étape 7 — Équipement (plan 05 §E.7).
 *
 * Pour chaque classe du draft (multi-class), l'utilisateur résout son groupe
 * d'options de départ. Les grants du background sont affichés mais déjà
 * automatiquement injectés au submit — pas de choix utilisateur.
 */
export function EquipmentStep(): JSX.Element {
  const draft = useWizardStore((s) => s.draft);
  const setEquipmentChoice = useWizardStore((s) => s.setEquipmentChoice);

  const classes = useContent('classes');
  const backgrounds = useContent('backgrounds');
  const items = useContent('items');

  const draftClasses = useMemo(
    () =>
      draft.classes
        .map((c) => classes.data.find((cc) => cc.id === c.classId))
        .filter((c): c is ClassEntity => Boolean(c)),
    [draft.classes, classes.data],
  );

  const background = useMemo(
    () => backgrounds.data.find((b) => b.id === draft.backgroundId) ?? null,
    [backgrounds.data, draft.backgroundId],
  );

  const itemById = useMemo(() => {
    const map = new Map<string, Item>();
    for (const it of items.data) map.set(it.id, it);
    return map;
  }, [items.data]);

  const handleAutoFill = (): void => {
    for (const cls of draftClasses) {
      const choice = applyReferenceEquipment(cls.id);
      setEquipmentChoice(cls.id, choice);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <StepIntro>{t('wizard.help.equipment.intro')}</StepIntro>

      {draftClasses.map((cls) => {
        const currentChoice = draft.equipmentChoices.find(
          (eq) => eq.classId === cls.id,
        );
        return (
          <div
            key={cls.id}
            className="flex flex-col gap-3 rounded-card border border-soft bg-bg-3/30 p-4"
          >
            <p className="font-title text-meta uppercase tracking-[0.18em] text-gold-bright">
              {t('wizard.equipment.fromClass')} — {localize(cls.name)}
            </p>
            <div className="flex flex-col gap-2">
              {cls.startingEquipment.options.map((opt, idx) => {
                const selected = currentChoice?.optionIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setEquipmentChoice(cls.id, idx)}
                    aria-pressed={selected}
                    className={cn(
                      'rounded-card-sm border p-3 text-left transition-all min-h-[44px]',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40',
                      selected
                        ? 'border-gold-bright bg-gold-bright/10'
                        : 'border-soft bg-bg-3/40 hover:border-glow',
                    )}
                  >
                    <p className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
                      {t('wizard.label.option')} {String.fromCharCode(65 + idx)}
                    </p>
                    <ul className="mt-2 flex flex-col gap-1 font-serif text-body text-text">
                      {opt.items.length === 0 ? (
                        <li className="italic text-text-tertiary">
                          {t('wizard.equipment.noItems')}
                        </li>
                      ) : (
                        opt.items.map((ref) => {
                          const item = itemById.get(ref.itemId);
                          return (
                            <li key={ref.itemId}>
                              {ref.qty > 1 ? `${ref.qty} × ` : ''}
                              {item ? localize(item.name) : ref.itemId}
                            </li>
                          );
                        })
                      )}
                      {opt.coins ? (
                        <li className="text-gold-bright">
                          + {opt.coins.qty} {opt.coins.unit.toUpperCase()}
                        </li>
                      ) : null}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {background && background.equipment.length > 0 ? (
        <div className="rounded-card border border-soft bg-bg-3/20 p-4">
          <p className="font-title text-meta uppercase tracking-[0.18em] text-gold-bright">
            {t('wizard.equipment.fromBackground')}
          </p>
          <ul className="mt-2 flex flex-col gap-1 font-serif text-body text-text-secondary">
            {background.equipment.map((ref) => {
              const item = itemById.get(ref.itemId);
              return (
                <li key={ref.itemId}>
                  {ref.qty > 1 ? `${ref.qty} × ` : ''}
                  {item ? localize(item.name) : ref.itemId}
                </li>
              );
            })}
            {background.startingCoins ? (
              <li className="text-gold-bright">
                + {background.startingCoins.qty} {background.startingCoins.unit.toUpperCase()}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <div>
        <Button
          variant="secondary"
          size="md"
          onClick={handleAutoFill}
          disabled={draftClasses.length === 0}
        >
          ✨ {t('wizard.action.autofill')}
        </Button>
      </div>
    </section>
  );
}
