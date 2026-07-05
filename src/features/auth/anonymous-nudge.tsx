import { type JSX } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/shared/components/button';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';

interface Props {
  className?: string;
}

/**
 * Bandeau non-bloquant invitant un utilisateur ANONYME à sauvegarder son compte
 * (liaison Google / e-mail via `/account`). L'usage principal de GrimWar est un
 * téléphone hors-ligne : un compte anonyme perdu (cache vidé, appareil changé)
 * emporte les personnages et l'appartenance aux campagnes. Ce rappel comble la
 * voie sans issue signalée par l'audit : rien n'incitait le joueur à sécuriser
 * son compte après avoir rejoint une campagne et créé sa fiche.
 *
 * Rendu `null` pour un utilisateur déjà lié (ou non connecté) — le bandeau ne
 * s'affiche que là où il a du sens. Il ne bloque jamais : c'est un rappel, pas
 * une porte. La liaison réelle vit sur `/account` (carte `LinkAccountCard`),
 * source unique de vérité du flux — on ne duplique pas le formulaire ici.
 */
export function AnonymousNudge({ className }: Props): JSX.Element | null {
  const { isAnonymous, user } = useAuth();
  const navigate = useNavigate();

  if (!user || !isAnonymous) return null;

  return (
    <div
      className={cn(
        'flex flex-col items-start gap-3 rounded-card-sm border border-gold-dim/40',
        'bg-gradient-to-b from-gold-bright/[0.06] to-transparent p-4',
        'sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      role="note"
    >
      <div className="min-w-0">
        <p className="font-title text-meta uppercase tracking-[0.16em] text-gold">
          {t('auth.nudge.title')}
        </p>
        <p className="mt-1 font-serif text-body-sm text-text-secondary">
          {t('auth.nudge.body')}
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => navigate('/account')}
        className="flex-shrink-0"
      >
        {t('auth.nudge.cta')}
      </Button>
    </div>
  );
}
