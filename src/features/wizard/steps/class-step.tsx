import { useMemo, useState, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { DetailModal } from '@/shared/components/detail-modal';
import { NumberInput } from '@/shared/components/form';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';
import type { ClassEntity } from '@/shared/types/content';

import { HelpPanel, StepIntro } from '../help/help-panel';
import { CLASS_HELP } from '../help/class-help';
import { HelpTriggerButton } from '../help/help-trigger-button';
import { ListWithHelpPanel } from '../help/list-with-help-panel';

import { ClassSubChoicesSection } from './class/class-sub-choices-section';

/**
 * Étape 2 — Classe (+ multi-class conditionnel) (plan 05 §E.2).
 *
 * UX (UAT post-plan 05) :
 *   - cards des 12 classes, sélection unique pour la classe primaire.
 *   - Desktop : panneau pédagogique persistant à droite, piloté par
 *     `previewClassId` (le dernier hover/focus). Pas de retour à null sur
 *     mouseleave — le panneau reste collé au dernier choix consulté.
 *   - Mobile : bouton « ? » par carte → ouvre `<DetailModal>` partagée.
 *   - si `level ≥ 2` et 1 classe choisie : bouton « Ajouter une autre classe ».
 *   - la somme des niveaux par classe doit égaler `draft.level`.
 */
export function ClassStep(): JSX.Element {
  const draft = useWizardStore((s) => s.draft);
  const addClass = useWizardStore((s) => s.addClass);
  const removeClass = useWizardStore((s) => s.removeClass);
  const updateClassLevel = useWizardStore((s) => s.updateClassLevel);
  const setPrimaryClass = useWizardStore((s) => s.setPrimaryClass);

  const classes = useContent('classes');
  // Sélection persistante du dernier item consulté côté desktop. Ne se vide
  // pas sur mouseleave/blur — bascule uniquement quand un autre item devient
  // actif (hover, focus, clic).
  const [previewClassId, setPreviewClassId] = useState<string | null>(null);
  // Modal mobile : ouverte par tap sur le bouton « ? » d'une ligne.
  const [modalClassId, setModalClassId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const totalAssigned = draft.classes.reduce((acc, c) => acc + c.level, 0);
  const remaining = draft.level - totalAssigned;

  const previewClass = useMemo<ClassEntity | null>(() => {
    const id = previewClassId ?? draft.primaryClassId ?? draft.classes[0]?.classId ?? null;
    if (!id) return null;
    return classes.data.find((c) => c.id === id) ?? null;
  }, [previewClassId, draft.primaryClassId, draft.classes, classes.data]);

  const modalClass = useMemo<ClassEntity | null>(() => {
    if (!modalClassId) return null;
    return classes.data.find((c) => c.id === modalClassId) ?? null;
  }, [modalClassId, classes.data]);

  const handlePickPrimary = (classId: string): void => {
    setPreviewClassId(classId);
    if (draft.classes.length === 0) {
      addClass(classId, draft.level);
      setPrimaryClass(classId);
      return;
    }
    // Remplace la première classe (la primaire) par la nouvelle sélection.
    const old = draft.classes.find((c) => c.classId === draft.primaryClassId);
    if (old && old.classId !== classId) {
      removeClass(old.classId);
      addClass(classId, old.level);
      setPrimaryClass(classId);
    }
  };

  const handleAddSecondClass = (classId: string): void => {
    if (draft.classes.some((c) => c.classId === classId)) return;
    addClass(classId, 1);
    // Réduit la primaire d'un niveau pour respecter la somme.
    const primary = draft.classes.find((c) => c.classId === draft.primaryClassId);
    if (primary && primary.level > 1) {
      updateClassLevel(primary.classId, primary.level - 1);
    }
    setAdding(false);
  };

  return (
    <section className="flex flex-col gap-6">
      <StepIntro>{t('wizard.help.class.intro')}</StepIntro>

      <ListWithHelpPanel
        list={
          <ul
            className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
            aria-label={t('wizard.class.list.aria')}
          >
            {classes.data.map((c) => {
              const isPrimary = draft.primaryClassId === c.id;
              const isSecondary =
                !isPrimary && draft.classes.some((x) => x.classId === c.id);
              const name = localize(c.name);
              return (
                <li key={c.id} className="relative">
                  <button
                    type="button"
                    onClick={() => handlePickPrimary(c.id)}
                    onMouseEnter={() => setPreviewClassId(c.id)}
                    onFocus={() => setPreviewClassId(c.id)}
                    className={cn(
                      'group flex w-full min-h-[68px] flex-col items-start gap-1 rounded-card border p-3 pr-12 text-left transition-all duration-150',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40',
                      isPrimary
                        ? 'border-gold-bright bg-gold-bright/10 shadow-gold-glow'
                        : isSecondary
                          ? 'border-gold bg-gold/[0.06]'
                          : 'border-soft bg-bg-3/30 hover:border-glow hover:bg-bg-3/50',
                    )}
                    aria-pressed={isPrimary}
                  >
                    <span className="font-display text-[15px] text-gold-bright">
                      {name}
                    </span>
                    <span className="font-serif text-[12px] text-text-tertiary">
                      {CLASS_HELP[c.id]?.tagline ?? ''}
                    </span>
                  </button>
                  <HelpTriggerButton
                    ariaLabel={`${t('wizard.helpPanel.viewDetail')} · ${name}`}
                    onClick={() => setModalClassId(c.id)}
                    className="absolute top-2 right-2"
                  />
                </li>
              );
            })}
          </ul>
        }
        panel={
          previewClass ? (
            <HelpPanel
              title={localize(previewClass.name)}
              tagline={CLASS_HELP[previewClass.id]?.tagline}
              whyChoose={CLASS_HELP[previewClass.id]?.whyChoose}
              inGame={CLASS_HELP[previewClass.id]?.inGame}
              difficulty={CLASS_HELP[previewClass.id]?.difficulty}
            />
          ) : null
        }
      />

      <DetailModal
        open={modalClass !== null}
        onClose={() => setModalClassId(null)}
        titleId="class-detail-modal-title"
        closeLabel={t('wizard.helpPanel.close')}
      >
        {modalClass ? (
          <div className="p-4 sm:p-5">
            <HelpPanel
              title={localize(modalClass.name)}
              tagline={CLASS_HELP[modalClass.id]?.tagline}
              whyChoose={CLASS_HELP[modalClass.id]?.whyChoose}
              inGame={CLASS_HELP[modalClass.id]?.inGame}
              difficulty={CLASS_HELP[modalClass.id]?.difficulty}
              headingId="class-detail-modal-title"
            />
          </div>
        ) : null}
      </DetailModal>

      <ClassSubChoicesSection />

      {/* Multi-class — visible uniquement si level >= 2 et une classe choisie */}
      {draft.level >= 2 && draft.classes.length >= 1 ? (
        <div className="flex flex-col gap-3 rounded-card border border-soft bg-bg-3/30 p-4">
          <p className="font-title text-meta uppercase tracking-[0.18em] text-gold-bright">
            {t('wizard.class.multiclass.title')}
          </p>
          <p className="font-serif text-[13px] text-text-secondary">
            {t('wizard.class.multiclass.intro')}
          </p>
          <ul className="flex flex-col gap-2">
            {draft.classes.map((entry) => {
              const meta = classes.data.find((c) => c.id === entry.classId);
              if (!meta) return null;
              return (
                <li
                  key={entry.classId}
                  className="flex items-center justify-between gap-3 rounded-card-sm bg-bg-3/40 px-3 py-2"
                >
                  <span className="font-serif text-body text-text">
                    {localize(meta.name)}
                    {entry.classId === draft.primaryClassId ? (
                      <span className="ml-2 font-title text-meta text-gold-bright tracking-[0.18em]">
                        ★ {t('wizard.class.primary')}
                      </span>
                    ) : null}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-title text-meta text-text-tertiary">
                      {t('wizard.field.level')}
                    </span>
                    <NumberInput
                      value={entry.level}
                      min={1}
                      max={draft.level}
                      onValueChange={(v) => updateClassLevel(entry.classId, v)}
                      aria-label={`${localize(meta.name)} — ${t('wizard.field.level')}`}
                      decrementLabel={t('wizard.aria.decrement')}
                      incrementLabel={t('wizard.aria.increment')}
                      className="w-20"
                    />
                    {draft.classes.length > 1 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeClass(entry.classId)}
                        aria-label={t('wizard.class.remove.aria')}
                      >
                        ✕
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          {remaining !== 0 ? (
            <p
              role="alert"
              className="font-serif text-[13px] text-crimson"
            >
              {t('wizard.class.multiclass.sumMismatch')} ({totalAssigned} / {draft.level})
            </p>
          ) : null}

          {draft.classes.length < 4 ? (
            adding ? (
              <div className="flex flex-col gap-2">
                <p className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
                  {t('wizard.class.multiclass.pick')}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {classes.data
                    .filter((c) => !draft.classes.some((x) => x.classId === c.id))
                    .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleAddSecondClass(c.id)}
                        className={cn(
                          'min-h-[44px] rounded-card-sm border border-soft bg-bg-3/40 px-3 py-2 text-left',
                          'font-serif text-[13px] text-text hover:border-glow',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40',
                        )}
                      >
                        {localize(c.name)}
                      </button>
                    ))}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
                  {t('wizard.class.multiclass.cancel')}
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAdding(true)}
                disabled={draft.classes.length === 0}
              >
                + {t('wizard.class.multiclass.add')}
              </Button>
            )
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
