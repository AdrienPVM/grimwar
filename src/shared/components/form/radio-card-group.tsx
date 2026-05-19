import { useId, type ReactNode } from 'react';

import { cn } from '../../lib/cn';

export interface RadioCardOption<T extends string> {
  value: T;
  /** Titre principal — gros, gold, lecture rapide. */
  title: ReactNode;
  /** Description courte 1-2 lignes. Pédagogie sans jargon. */
  description?: ReactNode;
  /** Impact mécanique en 1 phrase, posé en bas de carte. */
  mechanicalImpact?: ReactNode;
  /** Petit pictogramme optionnel (emoji ou SVG) — purement décoratif (aria-hidden). */
  icon?: ReactNode;
  /**
   * Bouton « ? » à rendre en sibling du `<label>`, positionné en absolute
   * top-right de la carte (cf. plan 13.9 fix UAT 2026-05-19 Bug A). On le
   * rend HORS du `<label>` pour que tapper le « ? » n'active pas la radio
   * (label-for semantics). `helpButton` est typiquement un `<HelpTriggerButton>`.
   *
   * Quand présent, on ajoute `pr-12` au label pour que le titre ne déborde
   * pas sous la pastille « ? ».
   */
  helpButton?: ReactNode;
  disabled?: boolean;
}

interface RadioCardGroupProps<T extends string> {
  /** Label visuel du fieldset (toujours rendu — c'est le titre du sous-choix). */
  legend: string;
  /** Helper court rendu sous la legend pour cadrer le débutant. */
  helper?: ReactNode;
  /** Identifiant unique parmi le wizard pour rassembler les radios (name HTML). */
  name: string;
  /** Valeur active ou null si rien n'est encore choisi. */
  value: T | null;
  onValueChange: (next: T) => void;
  options: ReadonlyArray<RadioCardOption<T>>;
  /** Disposition par défaut : 2 colonnes mobile / 3 colonnes sm+. */
  columns?: 'auto' | 1 | 2 | 3;
  className?: string;
}

/**
 * Groupe de cartes radio illustrées (plan 13.8 step 1).
 *
 * Pourquoi un composant distinct de `<RadioGroup>` ? Les sous-choix
 * d'ascendance / classe sont des choix narratifs qui se présentent mieux en
 * cartes lisibles (titre + tagline + impact mécanique) qu'en lignes compactes.
 * Le pattern partagé garantit a11y + tokens cohérents entre tous les
 * sous-choix.
 *
 * A11y :
 * - `<fieldset>` + `<legend>` (lus en bloc par les lecteurs d'écran).
 * - `role="radiogroup"` + chaque carte est un `<label>` wrappant un `<input
 *   type="radio">` natif (navigation flèches gratuite via le `name` commun).
 * - Tap target ≥ 44px par carte.
 * - Focus visible via `focus-visible:ring`.
 * - Slot `helpButton` (plan 13.9 Bug A fix) rendu HORS du `<label>` pour
 *   que le tap sur « ? » ne coche pas la radio.
 */
export function RadioCardGroup<T extends string>({
  legend,
  helper,
  name,
  value,
  onValueChange,
  options,
  columns = 'auto',
  className,
}: RadioCardGroupProps<T>): JSX.Element {
  const reactId = useId();

  const gridCols =
    columns === 1
      ? 'grid-cols-1'
      : columns === 2
        ? 'grid-cols-2'
        : columns === 3
          ? 'grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2';

  return (
    <fieldset className={cn('border-0 p-0 m-0 flex flex-col gap-3', className)}>
      <legend className="font-title text-meta text-text-secondary uppercase tracking-[0.16em]">
        {legend}
      </legend>
      {helper ? (
        <p className="font-serif text-[13px] text-text-tertiary -mt-1">{helper}</p>
      ) : null}
      <div role="radiogroup" aria-label={legend} className={cn('grid gap-2.5', gridCols)}>
        {options.map((opt) => {
          const id = `radio-card-${reactId}-${opt.value}`;
          const checked = value === opt.value;
          return (
            <RadioCard
              key={opt.value}
              id={id}
              name={name}
              option={opt}
              checked={checked}
              onSelect={() => !opt.disabled && onValueChange(opt.value)}
            />
          );
        })}
      </div>
    </fieldset>
  );
}

function RadioCard<T extends string>({
  id,
  name,
  option,
  checked,
  onSelect,
}: {
  id: string;
  name: string;
  option: RadioCardOption<T>;
  checked: boolean;
  onSelect: () => void;
}): JSX.Element {
  const hasHelp = option.helpButton != null;
  // Quand un slot help est présent, on isole le label dans un wrapper relatif
  // et on pose le « ? » en absolute top-right (sibling, pas enfant — cf. doc
  // du fichier). Sinon on retombe sur le `<label>` nu pour ne pas alourdir
  // le DOM des callers historiques.
  const card = (
    <label
      htmlFor={id}
      className={cn(
        'group relative flex min-h-[68px] cursor-pointer flex-col gap-1 rounded-card border p-3',
        'transition-all duration-150 ease-base',
        'focus-within:ring-2 focus-within:ring-gold-bright/40',
        checked
          ? 'border-gold-bright bg-gold-bright/10 shadow-gold-glow'
          : 'border-soft bg-bg-3/30 hover:border-glow hover:bg-bg-3/50',
        option.disabled && 'cursor-not-allowed opacity-50',
        hasHelp && 'pr-12',
      )}
    >
      <input
        id={id}
        name={name}
        type="radio"
        value={option.value}
        checked={checked}
        disabled={option.disabled}
        onChange={onSelect}
        className="peer sr-only"
      />
      <span className="flex items-center gap-2">
        {option.icon ? (
          <span aria-hidden="true" className="text-[18px] leading-none">
            {option.icon}
          </span>
        ) : null}
        <span
          className={cn(
            'font-display text-[15px]',
            checked ? 'text-gold-bright' : 'text-gold',
          )}
        >
          {option.title}
        </span>
      </span>
      {option.description ? (
        <span className="font-serif text-[13px] text-text">{option.description}</span>
      ) : null}
      {option.mechanicalImpact ? (
        <span className="mt-auto font-serif text-[12px] text-text-tertiary italic">
          {option.mechanicalImpact}
        </span>
      ) : null}
    </label>
  );

  if (!hasHelp) return card;

  return (
    <div className="relative">
      {card}
      <span className="absolute top-1 right-1">{option.helpButton}</span>
    </div>
  );
}
