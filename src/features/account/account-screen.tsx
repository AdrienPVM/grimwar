import { useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/shared/components/button';
import { Card, CardHeader } from '@/shared/components/card';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { PageContainer } from '@/shared/components/page-container';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import type { DiceMode } from '@/shared/lib/rules/dice-mode';
import {
  setDiceMode,
  setFollowCampaignDiceMode,
  useUserSettingsStore,
} from '@/shared/lib/slices/user-settings-slice';

/**
 * Écran « Mon compte » (amorce plan 35) — destination du losange avatar du
 * NavShell (jusqu'ici un noop). Profil + préférences de jeu.
 *
 * Pur client : lecture de l'état Auth + écriture des préférences via le chemin
 * EXISTANT `users/{uid}.settings.*` (rule `users/{userId}` autorise déjà le
 * propriétaire — aucune nouvelle security rule). GDPR (export / suppression),
 * gestion d'abonnement et switch de langue restent différés au plan 35 complet
 * (S5) : le switch FR/EN attend le backfill du contenu EN des bundles.
 */
export function AccountScreen(): JSX.Element {
  const { user, isAnonymous } = useAuth();

  if (!user) {
    return (
      <main className="relative z-10 mx-auto flex min-h-[60vh] max-w-[460px] flex-col items-center justify-center px-6 py-12">
        <GlassPanel className="w-full px-7 py-10 text-center">
          <h1 className="font-display text-xl uppercase tracking-[0.18em] text-gold-bright">
            {t('account.title')}
          </h1>
          <p className="mt-3 font-serif text-body italic text-text-secondary">
            {t('account.profile.anonymousHint')}
          </p>
        </GlassPanel>
      </main>
    );
  }

  return (
    <PageContainer width="content">
      <header className="text-center">
        <Divider className="mb-4" />
        <h1 className="font-display text-3xl font-bold uppercase tracking-[0.18em] text-gold-bright">
          {t('account.title')}
        </h1>
        <p className="mt-2 font-serif text-body italic text-text-secondary">
          {t('account.subtitle')}
        </p>
      </header>

      <div className="mx-auto mt-8 flex w-full max-w-[560px] flex-col gap-4">
        <ProfileCard
          displayName={user.displayName}
          email={user.email}
          photoURL={user.photoURL}
          isAnonymous={isAnonymous}
        />
        <PreferencesCard uid={user.uid} />
        <SignOutCard />
      </div>
    </PageContainer>
  );
}

interface ProfileCardProps {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

function ProfileCard({
  displayName,
  email,
  photoURL,
  isAnonymous,
}: ProfileCardProps): JSX.Element {
  const name = isAnonymous
    ? t('account.profile.anonymous')
    : displayName ?? email ?? t('account.profile.anonymous');
  const initial = (name[0] ?? 'A').toUpperCase();
  // Heuristique de provider sans `providerData` : invité < photo Google < e-mail.
  const provider = isAnonymous
    ? t('account.provider.anonymous')
    : photoURL
      ? t('account.provider.google')
      : t('account.provider.password');

  return (
    <Card>
      <CardHeader>
        <h3>{t('account.profile.title')}</h3>
      </CardHeader>
      <div className="flex items-center gap-4">
        <div
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center bg-gradient-to-br from-gold-bright to-gold-dim font-display text-xl font-bold text-ink shadow-[0_4px_14px_rgba(220,184,108,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]"
          style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
          aria-hidden="true"
        >
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-lg text-text">{name}</p>
          <p className="font-title text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">
            {provider}
          </p>
        </div>
      </div>

      {!isAnonymous && email ? (
        <dl className="mt-4 border-t border-white-8 pt-3">
          <dt className="font-title text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">
            {t('account.profile.emailLabel')}
          </dt>
          <dd className="mt-0.5 font-serif text-body text-text-secondary">{email}</dd>
        </dl>
      ) : null}

      {isAnonymous ? (
        <p className="mt-4 border-t border-white-8 pt-3 font-serif text-body-sm italic text-text-tertiary">
          {t('account.profile.anonymousHint')}
        </p>
      ) : null}
    </Card>
  );
}

const DICE_MODES: readonly { mode: DiceMode; labelKey: 'account.dice.digital' | 'account.dice.physical'; hintKey: 'account.dice.digitalHint' | 'account.dice.physicalHint' }[] = [
  { mode: 'digital', labelKey: 'account.dice.digital', hintKey: 'account.dice.digitalHint' },
  { mode: 'physical', labelKey: 'account.dice.physical', hintKey: 'account.dice.physicalHint' },
];

function PreferencesCard({ uid }: { uid: string }): JSX.Element {
  const diceMode = useUserSettingsStore((s) => s.diceMode);
  const followCampaign = useUserSettingsStore((s) => s.followCampaignDiceMode);

  return (
    <Card>
      <CardHeader>
        <h3>{t('account.prefs.title')}</h3>
      </CardHeader>

      <section aria-labelledby="account-dice-title">
        <p
          id="account-dice-title"
          className="font-title text-[11px] font-bold uppercase tracking-[0.2em] text-gold"
        >
          {t('account.dice.title')}
        </p>
        <p className="mt-1 font-serif text-body-sm text-text-tertiary">
          {t('account.dice.hint')}
        </p>

        <div
          role="radiogroup"
          aria-label={t('account.dice.title')}
          className={cn(
            'mt-3 grid grid-cols-2 gap-2',
            followCampaign && 'opacity-50',
          )}
        >
          {DICE_MODES.map(({ mode, labelKey, hintKey }) => {
            const active = diceMode === mode;
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={followCampaign}
                onClick={() => void setDiceMode(uid, mode)}
                className={cn(
                  'flex flex-col gap-1 rounded-card-sm border p-3 text-left transition-all duration-200 ease-base',
                  'disabled:cursor-not-allowed',
                  active
                    ? 'border-gold-dim bg-gradient-to-b from-gold-bright/[0.1] to-gold/[0.02]'
                    : 'border-white-8 bg-white/[0.02] hover:border-soft',
                )}
              >
                <span
                  className={cn(
                    'font-title text-[12px] font-bold uppercase tracking-[0.14em]',
                    active ? 'text-gold-bright' : 'text-text-secondary',
                  )}
                >
                  {t(labelKey)}
                </span>
                <span className="font-serif text-[12px] text-text-tertiary">
                  {t(hintKey)}
                </span>
              </button>
            );
          })}
        </div>

        <label className="mt-3 flex items-start justify-between gap-3 rounded-card-sm border border-white-8 bg-white/[0.02] p-3">
          <span className="min-w-0">
            <span className="block font-title text-[11px] font-bold uppercase tracking-[0.16em] text-text-secondary">
              {t('account.dice.followCampaign')}
            </span>
            <span className="mt-0.5 block font-serif text-[12px] text-text-tertiary">
              {t('account.dice.followCampaignHint')}
            </span>
          </span>
          <input
            type="checkbox"
            checked={followCampaign}
            onChange={(e) => void setFollowCampaignDiceMode(uid, e.target.checked)}
            aria-label={t('account.dice.followCampaign')}
            className="mt-1 h-5 w-5 flex-shrink-0 accent-gold-bright"
          />
        </label>
      </section>
    </Card>
  );
}

function SignOutCard(): JSX.Element {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<boolean>(false);

  async function doSignOut(): Promise<void> {
    await signOut();
    navigate('/');
  }

  return (
    <Card>
      {confirm ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirm(false)}
            className="flex-1"
          >
            {t('account.cancel')}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => void doSignOut()}
            className="flex-1"
          >
            {t('account.signOutConfirm')}
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirm(true)}
          className="w-full"
        >
          {t('account.signOut')}
        </Button>
      )}
    </Card>
  );
}
