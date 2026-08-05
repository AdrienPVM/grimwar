import { useState, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { parseDiceExpression } from '@/shared/lib/dice/parser';
import { t } from '@/shared/lib/i18n';

/**
 * Jet libre — « lance-moi 2d10+3 pour les dégâts de chute ».
 *
 * Le moteur savait déjà tout faire : `parseDiceExpression` gère les multi-termes,
 * `kh`/`kl`, les modificateurs plats et — depuis M48 — les dés retranchés
 * (`1d20-1d4`) ; il lève une erreur propre sur syntaxe invalide ; `rollExpression`
 * est mode-aware (numérique ou physique). Rien de tout cela n'était jamais
 * alimenté par une saisie : le seul jet libre de l'app était un d20 nu.
 *
 * La validation se fait À LA FRAPPE, pas à la soumission : un bouton « Lancer »
 * qui échoue après coup fait perdre le fil, alors qu'un message sous le champ
 * corrige tout de suite.
 */

interface FreeRollModalProps {
  readonly onSubmit: (expression: string) => void;
  readonly onClose: () => void;
}

export function FreeRollModal({
  onSubmit,
  onClose,
}: FreeRollModalProps): JSX.Element {
  const [expression, setExpression] = useState<string>('');

  const trimmed = expression.trim();
  // Chaîne vide = pas encore d'erreur à montrer ; on n'accuse pas un champ neuf.
  const invalid = trimmed.length > 0 && !isParsable(trimmed);
  const canSubmit = trimmed.length > 0 && !invalid;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('dice.free.aria')}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/85 px-4 py-6 backdrop-blur-xl sm:items-center"
    >
      <button
        type="button"
        aria-label={t('dice.free.cancel')}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative flex w-full max-w-[380px] flex-col gap-3 rounded-card border border-soft bg-glass p-5 shadow-card-lg">
        <h2 className="font-display text-[20px] font-black tracking-[-0.02em] text-gold-bright">
          {t('dice.free.title')}
        </h2>

        <label className="flex flex-col gap-1">
          <span className="font-title text-[10px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
            {t('dice.free.label')}
          </span>
          <input
            type="text"
            autoFocus
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) onSubmit(trimmed);
            }}
            placeholder={t('dice.free.placeholder')}
            data-testid="free-roll-input"
            autoComplete="off"
            spellCheck={false}
            className="rounded-card-sm border border-white-8 bg-ink/40 px-3 py-2 font-mono text-[15px] text-text placeholder:text-text-faint focus:border-gold-dim focus:outline-none"
          />
        </label>

        <p
          data-testid="free-roll-hint"
          className="font-serif text-[11px] italic text-text-faint"
        >
          {t('dice.free.hint')}
        </p>

        {invalid && (
          <p
            data-testid="free-roll-error"
            className="rounded-card-sm border border-crimson/40 bg-crimson/10 px-3 py-1.5 font-mono text-[11px] text-crimson"
          >
            {t('dice.free.invalid')}
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">
            {t('dice.free.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!canSubmit}
            onClick={() => onSubmit(trimmed)}
            data-testid="free-roll-submit"
            className="flex-1"
          >
            {t('dice.free.submit')}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** `true` si le parseur accepte l'expression. Le message d'erreur qu'il produit
 * est technique (`[dice/parser] …`) — on n'affiche que le verdict. */
function isParsable(expression: string): boolean {
  try {
    parseDiceExpression(expression);
    return true;
  } catch {
    return false;
  }
}
