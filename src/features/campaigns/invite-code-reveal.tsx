import { useEffect, useState, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { rotateInviteCode } from '@/shared/lib/services/campaigns';

interface Props {
  /** Code 6 chars affiché en grand — alphabet anti-confusion. */
  code: string;
  /**
   * Campagne à laquelle appartient le code. Quand elle est fournie AVEC `uid`,
   * le bloc expose la régénération (M11) — réservée au meneur, seul appelant de
   * ce composant à la poser.
   */
  campaignId?: string;
  /** UID du meneur qui régénère — la rule exige `createdBy == auth.uid`. */
  uid?: string;
  /** Notifie l'écran parent qu'un nouveau code est en place (refresh). */
  onRotated?: (nextCode: string) => void;
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
export function InviteCodeReveal({
  code,
  campaignId,
  uid,
  onRotated,
  className,
}: Props): JSX.Element {
  // Un seul feedback à la fois : 'code' (code copié), 'link' (lien copié) ou
  // 'rotated' (code régénéré).
  const [feedback, setFeedback] = useState<'code' | 'link' | 'rotated' | null>(
    null,
  );
  // Confirmation en deux temps plutôt qu'une modale : la régénération est
  // destructive mais LOCALE au bloc (elle n'affecte qu'un champ visible juste
  // au-dessus). Même patron que le retrait d'un objet d'inventaire.
  const [confirmingRotate, setConfirmingRotate] = useState<boolean>(false);
  const [rotating, setRotating] = useState<boolean>(false);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const canRotate = campaignId !== undefined && uid !== undefined;

  useEffect(() => {
    if (!feedback) return;
    const id = window.setTimeout(() => setFeedback(null), COPY_FEEDBACK_MS);
    return () => window.clearTimeout(id);
  }, [feedback]);

  async function handleCopy(): Promise<void> {
    const ok = await copyToClipboard(code);
    if (ok) setFeedback('code');
  }

  /**
   * Partage le LIEN d'invitation (décision LOCKED « lien + code 6 chars »).
   * Web Share API (feuille de partage native mobile) si dispo — sinon repli sur
   * copie du lien dans le presse-papiers. Le lien préremplit `?code=` sur
   * `/campaigns/join`, donc le destinataire n'a plus qu'à taper « Rejoindre ».
   */
  async function handleShareLink(): Promise<void> {
    const url = buildInviteLink(code);
    if (!url) return;
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      try {
        await navigator.share({
          title: t('campaigns.detail.invite.shareTitle'),
          url,
        });
        return;
      } catch {
        // Partage annulé/indispo → repli sur copie du lien.
      }
    }
    const ok = await copyToClipboard(url);
    if (ok) setFeedback('link');
  }

  /**
   * Régénère le code et révoque l'ancien (M11). Cas d'usage : le code a fuité
   * sur un Discord public. L'écriture est atomique côté service — soit les trois
   * docs changent, soit aucun.
   */
  async function handleRotate(): Promise<void> {
    if (!canRotate || rotating) return;
    setRotating(true);
    setRotateError(null);
    try {
      const next = await rotateInviteCode(campaignId, uid);
      setConfirmingRotate(false);
      setFeedback('rotated');
      onRotated?.(next);
    } catch {
      setRotateError(t('campaigns.detail.invite.rotateError'));
    } finally {
      setRotating(false);
    }
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
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            void handleCopy();
          }}
          aria-live="polite"
          tooltip={t('campaigns.tip.copyInviteCode')}
        >
          {feedback === 'code'
            ? t('campaigns.detail.invite.copied')
            : t('campaigns.detail.invite.copy')}
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => {
            void handleShareLink();
          }}
          aria-live="polite"
          tooltip={t('campaigns.tip.shareInviteLink')}
        >
          {feedback === 'link'
            ? t('campaigns.detail.invite.linkCopied')
            : t('campaigns.detail.invite.shareLink')}
        </Button>
      </div>
      <p className="mx-auto max-w-[36ch] text-center font-serif text-body-sm italic text-text-tertiary">
        {feedback === 'rotated'
          ? t('campaigns.detail.invite.rotated')
          : t('campaigns.detail.invite.help')}
      </p>

      {canRotate ? (
        <div className="flex w-full flex-col items-center gap-3 border-t border-white-8 pt-3">
          {confirmingRotate ? (
            <>
              <p className="mx-auto max-w-[40ch] text-center font-serif text-body-sm text-crimson">
                {t('campaigns.detail.invite.rotateWarning')}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingRotate(false)}
                  disabled={rotating}
                >
                  {t('campaigns.detail.invite.rotateCancel')}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    void handleRotate();
                  }}
                  disabled={rotating}
                >
                  {rotating
                    ? t('campaigns.detail.invite.rotating')
                    : t('campaigns.detail.invite.rotateConfirm')}
                </Button>
              </div>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setRotateError(null);
                setConfirmingRotate(true);
              }}
              tooltip={t('campaigns.tip.rotateInviteCode')}
            >
              {t('campaigns.detail.invite.rotate')}
            </Button>
          )}
          {rotateError ? (
            <p
              role="alert"
              className="text-center font-serif text-body-sm text-crimson"
            >
              {rotateError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Construit le lien d'invitation partageable : `${origin}/campaigns/join?code=XXXXXX`.
 * Renvoie `''` hors navigateur (SSR/test sans `window`). Exporté pour test.
 */
export function buildInviteLink(code: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/campaigns/join?code=${encodeURIComponent(code)}`;
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
