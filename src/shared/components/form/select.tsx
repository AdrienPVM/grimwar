import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { cn } from '../../lib/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  /** Liste d'options. La valeur sélectionnée correspond à `value`. */
  options: SelectOption[];
  /** Valeur courante (contrôlé). `''` pour "aucune sélection". */
  value: string;
  /** Notifie de la nouvelle valeur sélectionnée. */
  onValueChange: (value: string) => void;
  /** Texte affiché quand `value === ''`. */
  placeholder?: string;
  /** Désactive complètement le combobox. */
  disabled?: boolean;
  /** Reçu via `FormField` render-prop. */
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: 'true' | 'false';
  className?: string;
  /** Largeur du panneau ouvert. Par défaut, calé sur le trigger. */
  panelClassName?: string;
}

/**
 * Combobox custom WAI-ARIA APG "Select-Only Combobox".
 *
 * Pourquoi pas `<select>` natif (décision Adrien 2026-05-16) :
 * sur Windows Chrome/Edge le panneau ouvert est rendu par le chrome système
 * en blanc fixe — la couleur héritée du `<select>` (crème) s'applique aux
 * `<option>` → crème/blanc illisible. Bug remonté en UAT plan 05.
 *
 * Pattern WAI-ARIA APG : focus reste sur le `<button>` trigger,
 * `aria-activedescendant` pointe l'option mise en surbrillance. C'est la
 * forme la plus prévisible côté lecteur d'écran pour un choix unique
 * (single-select).
 *
 * Clavier :
 *  - ↓ : ouvre, ou descend d'une option ; ↑ : monte
 *  - Home/End : première / dernière
 *  - Enter/Space : ouvre ou sélectionne l'option active
 *  - Escape : ferme sans changer la valeur
 *  - Tab : ferme sans changer (laisse le focus passer)
 *  - Tape-pour-chercher : saute à l'option dont le label commence par la touche
 *
 * Souris :
 *  - Clic trigger : toggle
 *  - Clic option : sélectionne + ferme
 *  - Clic dehors : ferme
 */
export function Select({
  options,
  value,
  onValueChange,
  placeholder,
  disabled,
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  className,
  panelClassName,
}: SelectProps): JSX.Element {
  const reactId = useId();
  const listboxId = `${reactId}-listbox`;
  const optionIdPrefix = `${reactId}-opt`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  // Tampon "tape-pour-chercher" — reset après 500ms d'inactivité.
  const searchBufferRef = useRef<string>('');
  const searchTimerRef = useRef<number | null>(null);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;

  const optionId = (idx: number): string => `${optionIdPrefix}-${idx}`;

  const openPanel = useCallback((): void => {
    if (disabled) return;
    setOpen(true);
    setActiveIndex((current) => {
      if (current >= 0) return current;
      // Ouvre sur la sélection courante, ou sur le premier item activable.
      if (selectedIndex >= 0 && !options[selectedIndex]?.disabled) return selectedIndex;
      const first = options.findIndex((o) => !o.disabled);
      return first >= 0 ? first : -1;
    });
  }, [disabled, options, selectedIndex]);

  const closePanel = useCallback((): void => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const commit = useCallback(
    (idx: number): void => {
      const opt = options[idx];
      if (!opt || opt.disabled) return;
      onValueChange(opt.value);
      setOpen(false);
      setActiveIndex(-1);
      triggerRef.current?.focus();
    },
    [onValueChange, options],
  );

  const moveActive = useCallback(
    (direction: 1 | -1): void => {
      if (options.length === 0) return;
      setActiveIndex((current) => {
        let next = current;
        for (let step = 0; step < options.length; step++) {
          next = (next + direction + options.length) % options.length;
          if (!options[next]?.disabled) return next;
        }
        return current;
      });
    },
    [options],
  );

  const jumpToEdge = useCallback(
    (edge: 'start' | 'end'): void => {
      if (options.length === 0) return;
      const range =
        edge === 'start'
          ? options.map((_, i) => i)
          : options.map((_, i) => options.length - 1 - i);
      for (const i of range) {
        if (!options[i]?.disabled) {
          setActiveIndex(i);
          return;
        }
      }
    },
    [options],
  );

  const handleTypeahead = useCallback(
    (char: string): void => {
      if (searchTimerRef.current !== null) {
        window.clearTimeout(searchTimerRef.current);
      }
      searchBufferRef.current = (searchBufferRef.current + char).toLowerCase();
      searchTimerRef.current = window.setTimeout(() => {
        searchBufferRef.current = '';
        searchTimerRef.current = null;
      }, 500);
      const buf = searchBufferRef.current;
      // Cherche à partir de l'index courant + 1 (rotation).
      const start = activeIndex >= 0 ? activeIndex + 1 : 0;
      for (let i = 0; i < options.length; i++) {
        const idx = (start + i) % options.length;
        const opt = options[idx];
        if (opt && !opt.disabled && opt.label.toLowerCase().startsWith(buf)) {
          setActiveIndex(idx);
          return;
        }
      }
    },
    [activeIndex, options],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>): void => {
    if (disabled) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) {
          openPanel();
        } else {
          moveActive(1);
        }
        return;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) {
          openPanel();
        } else {
          moveActive(-1);
        }
        return;
      case 'Home':
        if (open) {
          e.preventDefault();
          jumpToEdge('start');
        }
        return;
      case 'End':
        if (open) {
          e.preventDefault();
          jumpToEdge('end');
        }
        return;
      case 'Enter':
        e.preventDefault();
        if (open && activeIndex >= 0) commit(activeIndex);
        else if (!open) openPanel();
        return;
      case ' ':
        // Espace : ouvre si fermé, sinon sélectionne.
        e.preventDefault();
        if (open && activeIndex >= 0) commit(activeIndex);
        else openPanel();
        return;
      case 'Escape':
        if (open) {
          e.preventDefault();
          closePanel();
        }
        return;
      case 'Tab':
        // Laisse le focus partir, mais ferme le panneau.
        if (open) closePanel();
        return;
      default:
        // Tape-pour-chercher — touche imprimable (1 caractère).
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          if (!open) openPanel();
          handleTypeahead(e.key);
        }
    }
  };

  // Click-outside : ferme le panneau.
  useEffect(() => {
    if (!open) return;
    const handleDocClick = (ev: MouseEvent): void => {
      const target = ev.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (listboxRef.current?.contains(target)) return;
      closePanel();
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [open, closePanel]);

  // Scroll automatique sur l'option active pour qu'elle reste visible.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = listboxRef.current?.querySelector<HTMLLIElement>(
      `[data-idx="${activeIndex}"]`,
    );
    // jsdom n'implémente pas scrollIntoView — feature-detect.
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [open, activeIndex]);

  const triggerLabel = selectedOption?.label ?? placeholder ?? '';
  const triggerIsPlaceholder = !selectedOption;

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          open && activeIndex >= 0 ? optionId(activeIndex) : undefined
        }
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        disabled={disabled}
        onClick={() => (open ? closePanel() : openPanel())}
        onKeyDown={handleKeyDown}
        className={cn(
          // Base — alignée sur inputBaseClasses mais sans dépendance circulaire.
          'w-full min-h-[44px] rounded-card-sm px-3 py-2 pr-10',
          'flex items-center justify-between gap-2',
          'bg-bg-3/40 text-text font-serif text-body text-left',
          'border border-soft transition-colors duration-150 ease-base',
          'hover:border-glow',
          'focus:outline-none focus:border-glow',
          'focus-visible:ring-2 focus-visible:ring-gold-bright/40 focus-visible:ring-offset-0',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'aria-[invalid=true]:border-crimson aria-[invalid=true]:focus-visible:ring-crimson/40',
          // Couleur du label : visuellement claire si "valeur", grisée si placeholder.
          triggerIsPlaceholder ? 'text-text-faint' : 'text-text',
        )}
      >
        <span className="truncate">{triggerLabel}</span>
        <Chevron open={open} />
      </button>

      {open ? (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          className={cn(
            'absolute z-50 mt-1 w-full max-h-72 overflow-y-auto',
            'rounded-card-sm border border-soft',
            'bg-bg-3 shadow-card-lg',
            // Petite respiration interne.
            'py-1',
            panelClassName,
          )}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isActive = idx === activeIndex;
            return (
              <li
                key={opt.value}
                id={optionId(idx)}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled || undefined}
                data-idx={idx}
                onMouseEnter={() => !opt.disabled && setActiveIndex(idx)}
                onClick={() => commit(idx)}
                className={cn(
                  'min-h-[44px] px-3 py-2 cursor-pointer font-serif text-body',
                  'flex items-center gap-2',
                  // Couleur de texte EXPLICITE : token clair sur fond sombre du panel.
                  'text-text',
                  isActive && 'bg-gold-bright/15 text-gold-bright',
                  isSelected && !isActive && 'text-gold-bright',
                  opt.disabled && 'opacity-40 cursor-not-allowed',
                )}
              >
                {isSelected ? (
                  <span aria-hidden="true" className="text-gold-bright">
                    ✓
                  </span>
                ) : (
                  <span aria-hidden="true" className="w-3" />
                )}
                <span className="truncate">{opt.label}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function Chevron({ open }: { open: boolean }): JSX.Element {
  const style: CSSProperties = {
    transition: 'transform 150ms cubic-bezier(0.22, 0.61, 0.36, 1)',
    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
  };
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 20 20"
      fill="#f0d28a"
      aria-hidden="true"
      style={style}
    >
      <path d="M5.5 8L10 12.5L14.5 8z" />
    </svg>
  );
}
