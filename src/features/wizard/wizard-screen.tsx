import { useEffect, useMemo, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { GlassPanel } from '@/shared/components/glass-panel';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { t, type StringKey } from '@/shared/lib/i18n';
import {
  useWizardStore,
  type WizardStepId,
} from '@/shared/lib/slices/wizard-slice';

import { WIZARD_STEP_META, nextStep, previousStep } from './wizard-steps';
import {
  isStepValid,
  shouldShowSpellsStep,
  type ValidationContext,
} from './wizard-validation';

import { IdentityStep } from './steps/identity-step';
import { ClassStep } from './steps/class-step';
import { AncestryStep } from './steps/ancestry-step';
import { AbilitiesStep } from './steps/abilities-step';
import { BackgroundStep } from './steps/background-step';
import { SkillsStep } from './steps/skills-step';
import { EquipmentStep } from './steps/equipment-step';
import { SpellsStep } from './steps/spells-step';
import { RecapStep } from './steps/recap-step';

const STEP_TITLE_KEY: Record<WizardStepId, StringKey> = {
  identity: 'wizard.step.identity.title',
  class: 'wizard.step.class.title',
  ancestry: 'wizard.step.ancestry.title',
  abilities: 'wizard.step.abilities.title',
  background: 'wizard.step.background.title',
  skills: 'wizard.step.skills.title',
  equipment: 'wizard.step.equipment.title',
  spells: 'wizard.step.spells.title',
  recap: 'wizard.step.recap.title',
};

/**
 * Coquille du wizard (plan 05 §C.2).
 *
 * Layout :
 *   - mobile (< 768px) : 1 étape pleine vue, barre de progression top,
 *     navigation bottom-fixed avec compteur N/M.
 *   - desktop (≥ 768px) : 2 colonnes dans un GlassPanel, sommaire à gauche +
 *     étape à droite. Navigation inline en bas du contenu.
 *
 * L'étape "Sorts" est conditionnellement masquée si aucune classe choisie n'est
 * lanceuse — le compteur N/M et la nav passent transparentement par-dessus.
 */
export function WizardScreen(): JSX.Element {
  const currentStep = useWizardStore((s) => s.currentStep);
  const draft = useWizardStore((s) => s.draft);
  const goToStep = useWizardStore((s) => s.goToStep);
  const visitedSteps = useWizardStore((s) => s.visitedSteps);

  const classesContent = useContent('classes');

  const validationCtx: ValidationContext = useMemo(
    () => ({ draft, classes: classesContent.data }),
    [draft, classesContent.data],
  );

  // Liste des étapes effectivement visibles (skip "spells" si aucun lanceur).
  const visibleSteps = useMemo(() => {
    const showSpells = shouldShowSpellsStep(validationCtx);
    return WIZARD_STEP_META.filter((m) => m.id !== 'spells' || showSpells);
  }, [validationCtx]);

  // Recalibre le compteur N/M selon la liste visible (pour éviter "9/9" quand
  // on n'a que 8 étapes).
  const currentVisibleIndex = visibleSteps.findIndex((m) => m.id === currentStep);
  const currentOrder = currentVisibleIndex < 0 ? 1 : currentVisibleIndex + 1;
  const totalVisible = visibleSteps.length;

  const valid = isStepValid(currentStep, validationCtx);

  // Si l'étape courante n'est plus visible (utilisateur a retiré sa classe
  // lanceuse depuis "Sorts" puis revenu en arrière) — rebascule sur la
  // précédente visible.
  useEffect(() => {
    if (currentVisibleIndex < 0) {
      const fallback = visibleSteps[Math.max(0, visibleSteps.length - 2)]?.id;
      if (fallback) goToStep(fallback);
    }
  }, [currentVisibleIndex, visibleSteps, goToStep]);

  const handlePrev = (): void => {
    const visibleIds = visibleSteps.map((s) => s.id);
    const idx = visibleIds.indexOf(currentStep);
    const prev = idx > 0 ? visibleIds[idx - 1] : null;
    if (prev) goToStep(prev);
    // Fallback : si l'étape précédente "naturelle" est sautée, utilise
    // previousStep() sur la liste complète.
    if (!prev) {
      const p = previousStep(currentStep);
      if (p) goToStep(p);
    }
  };

  const handleNext = (): void => {
    if (!valid) return;
    const visibleIds = visibleSteps.map((s) => s.id);
    const idx = visibleIds.indexOf(currentStep);
    const next = idx >= 0 ? visibleIds[idx + 1] : null;
    if (next) {
      goToStep(next);
      return;
    }
    // Fallback : si on est sur une étape qui n'est plus visible, on saute
    // simplement à la suivante du chemin nominal.
    const n = nextStep(currentStep);
    if (n) goToStep(n);
  };

  return (
    <main className="relative min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-60px)] px-4 pb-32 pt-6 sm:px-6 sm:pb-12">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header titre + barre de progression mobile */}
        <header className="mb-6 sm:mb-8">
          <h1 className="font-display text-display-lg text-gold-bright drop-shadow-[0_0_24px_rgba(220,184,108,0.3)]">
            {t('wizard.title')}
          </h1>
          <p className="mt-2 font-serif text-body text-text-secondary">
            {t('wizard.subtitle')}
          </p>
          <ProgressBar
            steps={visibleSteps.map((m) => m.id)}
            current={currentStep}
            visited={visitedSteps}
            currentOrder={currentOrder}
            totalVisible={totalVisible}
            onJump={(id) => visitedSteps.includes(id) && goToStep(id)}
          />
        </header>

        <GlassPanel className="p-5 sm:p-8">
          <div className="flex flex-col gap-8 md:grid md:grid-cols-[minmax(180px,240px)_1fr] md:gap-10">
            <DesktopToc
              steps={visibleSteps.map((m) => m.id)}
              current={currentStep}
              visited={visitedSteps}
              counts={{ total: totalVisible, current: currentOrder }}
              onJump={(id) => visitedSteps.includes(id) && goToStep(id)}
            />

            <div className="flex flex-col gap-6">
              <h2 className="font-display text-display text-gold-bright">
                {t(STEP_TITLE_KEY[currentStep])}
              </h2>
              <StepContent step={currentStep} />

              {/* Nav inline desktop */}
              <div className="hidden md:flex items-center justify-between gap-4 pt-4 border-t border-soft">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handlePrev}
                  disabled={currentStep === visibleSteps[0]?.id}
                >
                  ← {t('wizard.nav.previous')}
                </Button>
                <span className="font-title text-meta text-text-tertiary uppercase tracking-[0.18em]">
                  {currentOrder} / {totalVisible}
                </span>
                {currentStep === 'recap' ? (
                  <span className="font-title text-meta text-text-tertiary">
                    {/* Le bouton "Créer" vit dans RecapStep */}
                  </span>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleNext}
                    disabled={!valid}
                    aria-disabled={!valid}
                    title={!valid ? t('wizard.nav.invalidStep') : undefined}
                  >
                    {t('wizard.nav.next')} →
                  </Button>
                )}
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Nav fixed mobile */}
      <MobileNavBar
        current={currentOrder}
        total={totalVisible}
        canPrev={currentStep !== visibleSteps[0]?.id}
        canNext={valid && currentStep !== 'recap'}
        isRecap={currentStep === 'recap'}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </main>
  );
}

function ProgressBar({
  steps,
  current,
  visited,
  currentOrder,
  totalVisible,
  onJump,
}: {
  steps: WizardStepId[];
  current: WizardStepId;
  visited: WizardStepId[];
  currentOrder: number;
  totalVisible: number;
  onJump: (id: WizardStepId) => void;
}): JSX.Element {
  /*
   * UAT plan 05 §5 : sur mobile, les bulles « ronde » étaient illisibles
   * (vides + jaunes). Nouvelle approche :
   *   - ligne de texte explicite « Étape N/M — Nom » au-dessus,
   *   - barre fine sous le texte avec segment courant éclairé,
   *   - les segments restent cliquables (44px) pour revenir aux étapes
   *     visitées. Le texte clarifie le contexte, la barre donne la
   *     progression visuelle.
   */
  return (
    <div className="mt-4 flex flex-col gap-2">
      <p className="font-title text-meta uppercase tracking-[0.18em] text-gold-bright">
        <span className="text-text-tertiary">{t('wizard.progress.label')}</span>{' '}
        <span aria-hidden="true">{currentOrder}</span>
        <span aria-hidden="true" className="text-text-tertiary">
          {' / '}
        </span>
        <span aria-hidden="true">{totalVisible}</span>
        <span aria-hidden="true" className="mx-2 text-text-tertiary">
          —
        </span>
        <span>{t(STEP_TITLE_KEY[current])}</span>
        <span className="sr-only">
          {currentOrder} / {totalVisible}
        </span>
      </p>
      <div
        className="flex items-stretch gap-1.5"
        role="progressbar"
        aria-label={t('wizard.progress.aria')}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={steps.indexOf(current) + 1}
      >
        {steps.map((id) => {
          const isCurrent = id === current;
          const isVisited = visited.includes(id);
          // UAT plan 05 §6 : les segments coloraient le touch target (44px de
          // haut sur mobile via min-h), donc visuellement écrasants. On
          // sépare maintenant le touch target (button avec padding invisible)
          // de la barre colorée (span fin h-1.5). Discret à l'œil, accessible
          // au doigt.
          return (
            <button
              key={id}
              type="button"
              onClick={() => onJump(id)}
              disabled={!isVisited}
              aria-label={t(STEP_TITLE_KEY[id])}
              className={cn(
                'group flex flex-1 items-center justify-stretch',
                'min-h-[44px] sm:min-h-0 py-[19px] sm:py-0',
                'disabled:cursor-not-allowed',
                'focus-visible:outline-none',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'block h-[3px] w-full rounded-full transition-colors duration-200 ease-base',
                  isCurrent
                    ? 'bg-gold-bright shadow-[0_0_8px_rgba(253,233,180,0.35)]'
                    : isVisited
                      ? 'bg-gold-dim group-hover:bg-gold'
                      : 'bg-white/[0.06]',
                  'group-focus-visible:ring-2 group-focus-visible:ring-gold-bright/40 group-focus-visible:ring-offset-0',
                )}
              />
              <span className="sr-only">{t(STEP_TITLE_KEY[id])}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DesktopToc({
  steps,
  current,
  visited,
  counts,
  onJump,
}: {
  steps: WizardStepId[];
  current: WizardStepId;
  visited: WizardStepId[];
  counts: { total: number; current: number };
  onJump: (id: WizardStepId) => void;
}): JSX.Element {
  return (
    <nav
      aria-label={t('wizard.toc.aria')}
      className="hidden md:flex md:flex-col md:gap-1"
    >
      <ol className="flex flex-col gap-1">
        {steps.map((id, idx) => {
          const isCurrent = id === current;
          const isVisited = visited.includes(id);
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => isVisited && onJump(id)}
                disabled={!isVisited}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'w-full text-left rounded-card-sm px-3 py-2 min-h-[44px]',
                  'font-serif text-body transition-colors duration-150',
                  'disabled:cursor-not-allowed',
                  isCurrent
                    ? 'bg-gold-bright/10 text-gold-bright border border-gold/40'
                    : isVisited
                      ? 'text-text-secondary hover:text-gold-bright hover:bg-white/[0.04]'
                      : 'text-text-faint',
                )}
              >
                <span className="font-title text-meta tracking-[0.18em] mr-2">
                  {idx + 1}.
                </span>
                {t(STEP_TITLE_KEY[id])}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 font-title text-meta text-text-tertiary tracking-[0.18em] px-3">
        {counts.current} / {counts.total}
      </p>
    </nav>
  );
}

function MobileNavBar({
  current,
  total,
  canPrev,
  canNext,
  isRecap,
  onPrev,
  onNext,
}: {
  current: number;
  total: number;
  canPrev: boolean;
  canNext: boolean;
  isRecap: boolean;
  onPrev: () => void;
  onNext: () => void;
}): JSX.Element {
  return (
    <div
      className={cn(
        'fixed bottom-0 inset-x-0 z-40 md:hidden',
        'bg-[rgba(8,6,14,0.85)] backdrop-blur-[20px]',
        'border-t border-white-8 px-4 py-3',
        'flex items-center justify-between gap-3',
      )}
    >
      <Button variant="secondary" size="md" onClick={onPrev} disabled={!canPrev}>
        ←
      </Button>
      <span className="font-title text-meta text-text-tertiary tracking-[0.18em]">
        {current} / {total}
      </span>
      {isRecap ? (
        <span className="font-title text-meta text-text-tertiary" aria-hidden="true">
          {/* Le bouton "Créer" vit dans RecapStep */}
          ✦
        </span>
      ) : (
        <Button
          variant="primary"
          size="md"
          onClick={onNext}
          disabled={!canNext}
          aria-disabled={!canNext}
          title={!canNext ? t('wizard.nav.invalidStep') : undefined}
        >
          →
        </Button>
      )}
    </div>
  );
}

function StepContent({ step }: { step: WizardStepId }): JSX.Element {
  switch (step) {
    case 'identity':
      return <IdentityStep />;
    case 'class':
      return <ClassStep />;
    case 'ancestry':
      return <AncestryStep />;
    case 'abilities':
      return <AbilitiesStep />;
    case 'background':
      return <BackgroundStep />;
    case 'skills':
      return <SkillsStep />;
    case 'equipment':
      return <EquipmentStep />;
    case 'spells':
      return <SpellsStep />;
    case 'recap':
      return <RecapStep />;
  }
}
