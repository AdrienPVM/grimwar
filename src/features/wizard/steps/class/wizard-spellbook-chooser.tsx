import { useMemo, useState, type JSX } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';
import { cn } from '@/shared/lib/cn';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';
import type { Spell } from '@/shared/types/content';

import { ChooserMissingDataBanner } from '../chooser-missing-data-banner';
import { HelpTriggerButton } from '../../help/help-trigger-button';
import { ListWithHelpPanel } from '../../help/list-with-help-panel';
import { SpellHelpPanel } from '../../help/spell-help-panel';

import { toggleBoundedSelection } from './chooser-utils';
import {
  WIZARD_SPELLBOOK_INSCRIBED_COUNT_L1,
  WIZARD_SPELLBOOK_PREPARED_COUNT_L1,
} from './use-class-sub-choices';

/**
 * Chooser Magicien — Grimoire L1 (Spellbook — SRD 5.2.1).
 *
 * Dual list :
 * - **6 sorts inscrits** (`classes[i].wizardSpellbookL1`) — sélection libre
 *   parmi les sorts de niveau 1 de la liste Magicien.
 * - **4 sorts préparés** (`preparedSpells['wizard']` côté submit) — sous-
 *   sélection parmi les 6 inscrits.
 *
 * Le wizard step Sorts reste le source de vérité pour `cantrips` + `prepared`
 * jusqu'à la passation au submit. Ici, on capture explicitement le **grimoire
 * inscrit** (les 6) — c'est la sémantique SRD 2024 « le mago connaît plus de
 * sorts qu'il ne peut en préparer ». Les 4 préparés sont une sous-liste des 6.
 *
 * À L1, le grimoire commence avec 6 sorts. Le composant impose `count = 6`
 * pour les inscrits ; les préparés sont validés au submit (commit 3).
 */
export function WizardSpellbookChooser(): JSX.Element {
  const spells = useContent('spells');
  const setClassSubChoice = useWizardStore((s) => s.setClassSubChoice);
  const setSpellsForClass = useWizardStore((s) => s.setSpellsForClass);
  const entry = useWizardStore((s) =>
    s.draft.classes.find((c) => c.classId === 'wizard') ?? null,
  );
  const spellsForWizard = useWizardStore((s) =>
    s.draft.spellsByClass.find((x) => x.classId === 'wizard') ?? null,
  );

  // Sorts L1 de la liste Magicien — triés par nom pour stabilité.
  const eligible = useMemo(
    () =>
      spells.data
        .filter((sp) => sp.level === 1 && sp.classes.includes('wizard'))
        .sort((a, b) => {
          const an = a.name.fr ?? '';
          const bn = b.name.fr ?? '';
          return an.localeCompare(bn, 'fr');
        }),
    [spells.data],
  );

  // Modale détail mobile partagée par les deux sous-listes (inscrits + préparés)
  // — pattern hérité de `spells-step.tsx`. `null` = modale fermée.
  const [modalSpellId, setModalSpellId] = useState<string | null>(null);
  const modalSpell = useMemo<Spell | null>(() => {
    if (!modalSpellId) return null;
    return eligible.find((s) => s.id === modalSpellId) ?? null;
  }, [modalSpellId, eligible]);

  // Sélection persistante locale pour le panneau desktop (UAT 2026-05-18) :
  // sans cette bascule, le `?` est `md:hidden` et le desktop n'a aucun moyen
  // de lire la description d'un sort. Cf. `spells-step.tsx` pour le pattern.
  // Bascule uniquement quand un AUTRE sort devient actif — pas de retour à
  // null sur mouseleave (sinon le panneau clignoterait).
  const [previewSpellId, setPreviewSpellId] = useState<string | null>(null);
  const previewSpell = useMemo<Spell | null>(() => {
    if (!previewSpellId) return null;
    return eligible.find((s) => s.id === previewSpellId) ?? null;
  }, [previewSpellId, eligible]);

  if (eligible.length === 0)
    return (
      <ChooserMissingDataBanner
        chooserKey="wizard-spellbook"
        contentType="spells"
      />
    );

  const inscribed = entry?.wizardSpellbookL1 ?? [];
  const prepared = spellsForWizard?.level1 ?? [];
  const inscribedCount = WIZARD_SPELLBOOK_INSCRIBED_COUNT_L1;
  const preparedCount = WIZARD_SPELLBOOK_PREPARED_COUNT_L1;
  const reachedInscribedCap = inscribed.length >= inscribedCount;
  const reachedPreparedCap = prepared.length >= preparedCount;

  const onToggleInscribed = (id: string): void => {
    const next = toggleBoundedSelection(inscribed, id, inscribedCount);
    setClassSubChoice('wizard', 'wizardSpellbookL1', next);
    // Si on désinscrit un sort, il doit aussi être déprésaré (sécurité).
    if (!next.includes(id) && prepared.includes(id)) {
      setSpellsForClass(
        'wizard',
        spellsForWizard?.cantrips ?? [],
        prepared.filter((x) => x !== id),
      );
    }
  };

  const onTogglePrepared = (id: string): void => {
    // On ne peut préparer qu'un sort déjà inscrit.
    if (!inscribed.includes(id)) return;
    const next = toggleBoundedSelection(prepared, id, preparedCount);
    setSpellsForClass('wizard', spellsForWizard?.cantrips ?? [], next);
  };

  const list = (
    <fieldset className="flex flex-col gap-5 border-0 p-0 m-0">
      <div className="flex flex-col gap-2">
        <legend className="font-title text-meta text-text-secondary uppercase tracking-[0.16em]">
          {t('wizard.subchoice.wizardSpellbook.inscribedLegend')}
        </legend>
        <p className="font-serif text-[13px] text-text-tertiary">
          {t('wizard.subchoice.wizardSpellbook.inscribedHelper').replace(
            '{count}',
            String(inscribedCount),
          )}
        </p>
        <p className="font-serif text-[13px] text-text-secondary" aria-live="polite">
          {inscribed.length} / {inscribedCount}
        </p>
      </div>
      <div
        role="group"
        aria-label={t('wizard.subchoice.wizardSpellbook.inscribedLegend')}
        className="grid gap-2 grid-cols-1 sm:grid-cols-2 max-h-[420px] overflow-y-auto pr-1"
      >
        {eligible.map((sp) => {
          const checked = inscribed.includes(sp.id);
          const disabled = !checked && reachedInscribedCap;
          const name = localize(sp.name);
          return (
            <div
              key={sp.id}
              className="relative"
              onMouseEnter={() => setPreviewSpellId(sp.id)}
              onFocus={() => setPreviewSpellId(sp.id)}
            >
              <label
                htmlFor={`wizard-inscribed-${sp.id}`}
                className={cn(
                  'group relative flex min-h-[44px] cursor-pointer items-center gap-2 rounded-card-sm border px-3 py-2 pr-12',
                  'transition-all duration-150 ease-base',
                  'focus-within:ring-2 focus-within:ring-gold-bright/40',
                  checked
                    ? 'border-gold-bright bg-gold-bright/10'
                    : 'border-soft bg-bg-3/30 hover:border-glow',
                  disabled && 'cursor-not-allowed opacity-40',
                )}
              >
                <input
                  id={`wizard-inscribed-${sp.id}`}
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggleInscribed(sp.id)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    'font-display text-[14px]',
                    checked ? 'text-gold-bright' : 'text-gold',
                  )}
                >
                  {name}
                </span>
              </label>
              <HelpTriggerButton
                ariaLabel={`${t('wizard.helpPanel.viewDetail')} · ${name}`}
                onClick={() => setModalSpellId(sp.id)}
                className="absolute top-1/2 right-1 -translate-y-1/2"
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 mt-2">
        <legend className="font-title text-meta text-text-secondary uppercase tracking-[0.16em]">
          {t('wizard.subchoice.wizardSpellbook.preparedLegend')}
        </legend>
        <p className="font-serif text-[13px] text-text-tertiary">
          {t('wizard.subchoice.wizardSpellbook.preparedHelper').replace(
            '{count}',
            String(preparedCount),
          )}
        </p>
        <p className="font-serif text-[13px] text-text-secondary" aria-live="polite">
          {prepared.length} / {preparedCount}
        </p>
      </div>
      <div
        role="group"
        aria-label={t('wizard.subchoice.wizardSpellbook.preparedLegend')}
        className="grid gap-2 grid-cols-1 sm:grid-cols-2"
      >
        {inscribed.length === 0 ? (
          <p className="font-serif text-[13px] text-text-tertiary italic col-span-full">
            {t('wizard.subchoice.wizardSpellbook.preparedEmpty')}
          </p>
        ) : (
          inscribed.map((id) => {
            const sp = eligible.find((s) => s.id === id);
            if (!sp) return null;
            const checked = prepared.includes(id);
            const disabled = !checked && reachedPreparedCap;
            const name = localize(sp.name);
            return (
              <div
                key={id}
                className="relative"
                onMouseEnter={() => setPreviewSpellId(id)}
                onFocus={() => setPreviewSpellId(id)}
              >
                <label
                  htmlFor={`wizard-prepared-${id}`}
                  className={cn(
                    'group relative flex min-h-[44px] cursor-pointer items-center gap-2 rounded-card-sm border px-3 py-2 pr-12',
                    'transition-all duration-150 ease-base',
                    'focus-within:ring-2 focus-within:ring-gold-bright/40',
                    checked
                      ? 'border-gold-bright bg-gold-bright/10'
                      : 'border-soft bg-bg-3/30 hover:border-glow',
                    disabled && 'cursor-not-allowed opacity-40',
                  )}
                >
                  <input
                    id={`wizard-prepared-${id}`}
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onTogglePrepared(id)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      'font-display text-[14px]',
                      checked ? 'text-gold-bright' : 'text-gold',
                    )}
                  >
                    {name}
                  </span>
                </label>
                <HelpTriggerButton
                  ariaLabel={`${t('wizard.helpPanel.viewDetail')} · ${name}`}
                  onClick={() => setModalSpellId(sp.id)}
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                />
              </div>
            );
          })
        )}
      </div>

    </fieldset>
  );

  return (
    <>
      <ListWithHelpPanel
        list={list}
        panel={previewSpell ? <SpellHelpPanel spell={previewSpell} /> : null}
        panelKey={previewSpell ? `spell:${previewSpell.id}` : undefined}
      />
      <DetailModal
        open={modalSpell !== null}
        onClose={() => setModalSpellId(null)}
        titleId="wizard-spellbook-detail-modal-title"
        closeLabel={t('wizard.helpPanel.close')}
      >
        {modalSpell ? (
          <div className="p-4 sm:p-5">
            <SpellHelpPanel
              spell={modalSpell}
              headingId="wizard-spellbook-detail-modal-title"
            />
          </div>
        ) : null}
      </DetailModal>
    </>
  );
}
