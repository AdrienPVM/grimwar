import { useEffect, useState, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';

interface Props {
  /** Code 6 chars affiché en grand — alphabet anti-confusion. */
  code: string;
  /** Permet de styler l'enveloppe selon le contexte (carte vs modale). */
  className?: string;
}

const COPY_FEEDBACK_MS = 1800;

/**
 * Composant d'affichage + copie d'un code d'invitation. Le code est rendu en
 * grand caractère mono espacé pour faciliter la dictée à voix haute autour de
 * la table (cf. décision JALON-4.0 — alphabet [A-Z2-9]\{I,O} pour la même
 * raison).
 *
 * Le bouton « Copier » utilise `navigator.clipboard.writeText` quand
 * disponible. Fallback graceful : si l'API est absente (Safari iOS < 13.4
 * sans contexte sécurisé, environnements de test sans clipboard), on bascule
 * sur un `document.execCommand('copy')` via une textarea hors-écran. Si même
 * ça ne marche pas, le bouton reste inactif visuellement et l'utilisateur
 * peut sélectionner le code à la main (text-selectable).
 *
 * Feedback : le label du bouton bascule sur « Copié ! » pendant
 * COPY_FEEDBACK_MS puis revient. Pas de toast — le feedback inline suffit et
 * évite un side-effect global.
 */
export function InviteCodeReveal({ code, className }: Props): JSX.Element {
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function handleCopy(): Promise<void> {
    const ok = await copyToClipboard(code);
    if (ok) setCopied(true);
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-card-sm border border-white-8 bg-bg-3/40 p-5',
        className,
      )}
      aria-label={t('campaigns.detail.invite.aria')}
    >
      <p className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
        {t('campaigns.detail.invite.codeLabel')}
      </p>
      <p
        className="select-all font-mono text-2xl font-bold tracking-[0.32em] text-gold-bright"
        aria-label={t('campaigns.detail.invite.codeAria')}
      >
        {code}
      </p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          void handleCopy();
        }}
        aria-live="polite"
      >
        {copied
          ? t('campaigns.detail.invite.copied')
          : t('campaigns.detail.invite.copy')}
      </Button>
      <p className="mx-auto max-w-[36ch] text-center font-serif text-body-sm italic text-text-tertiary">
        {t('campaigns.detail.invite.help')}
      </p>
    </div>
  );
}

/**
 * Helper isolé pour le test — couvre les 3 chemins de copie (API moderne,
 * fallback execCommand, échec silencieux). Renvoie `true` si la copie a abouti.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Continue vers le fallback.
    }
  }
  if (typeof document === 'undefined') return false;
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
