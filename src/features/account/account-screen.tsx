import { useState, type FormEvent, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/shared/components/button';
import { Card, CardHeader } from '@/shared/components/card';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { Icon } from '@/shared/components/icon';
import { PageContainer } from '@/shared/components/page-container';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { useDevicePrefsStore } from '@/shared/lib/slices/device-prefs-slice';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { DiceMode } from '@/shared/lib/rules/dice-mode';
import { useLocaleStore, type Locale } from '@/shared/lib/slices/locale-slice';
import {
  setDiceMode,
  setFollowCampaignDiceMode,
  setUserLocale,
  useUserSettingsStore,
} from '@/shared/lib/slices/user-settings-slice';

/**
 * Écran « Mon compte » (amorce plan 35) — destination du losange avatar du
 * NavShell (jusqu'ici un noop). Profil + préférences de jeu.
 *
 * Pur client : lecture de l'état Auth + écriture des préférences via le chemin
 * EXISTANT `users/{uid}.settings.*` + `users/{uid}.locale` (rule `users/{userId}`
 * autorise déjà le propriétaire — aucune nouvelle security rule). GDPR (export /
 * suppression) et gestion d'abonnement restent différés au plan 35 complet (S5).
 *
 * Switch de langue FR/Anglais : livré (les bundles SRD portent `name.en` +
 * `description.en` à 100 %, les strings UI sont 100 % FR+EN). Seul gap connu —
 * 180 magic-items du bundle grandfathered AideDD sans `name.en` retombent en FR
 * via `localize()` (fallback gracieux, jamais de clé brute). Cf. plans/DEBT.md.
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
        {isAnonymous ? <LinkAccountCard /> : null}
        <PreferencesCard uid={user.uid} />
        <CustomContentCard />
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

const LOCALES: readonly { locale: Locale; labelKey: 'account.locale.fr' | 'account.locale.en' }[] = [
  { locale: 'fr', labelKey: 'account.locale.fr' },
  { locale: 'en', labelKey: 'account.locale.en' },
];

function PreferencesCard({ uid }: { uid: string }): JSX.Element {
  const diceMode = useUserSettingsStore((s) => s.diceMode);
  const followCampaign = useUserSettingsStore((s) => s.followCampaignDiceMode);
  const locale = useLocaleStore((s) => s.locale);
  const haptics = useDevicePrefsStore((s) => s.haptics);
  const setHaptics = useDevicePrefsStore((s) => s.setHaptics);
  const dice3d = useDevicePrefsStore((s) => s.dice3d);
  const gameNotifications = useDevicePrefsStore((s) => s.gameNotifications);
  const setGameNotifications = useDevicePrefsStore((s) => s.setGameNotifications);
  const setDice3d = useDevicePrefsStore((s) => s.setDice3d);

  return (
    <Card>
      <CardHeader>
        <h3>{t('account.prefs.title')}</h3>
      </CardHeader>

      <section aria-labelledby="account-locale-title" className="mb-6">
        <p
          id="account-locale-title"
          className="font-title text-[11px] font-bold uppercase tracking-[0.2em] text-gold"
        >
          {t('account.locale.title')}
        </p>
        <p className="mt-1 font-serif text-body-sm text-text-tertiary">
          {t('account.locale.hint')}
        </p>

        <div
          role="radiogroup"
          aria-label={t('account.locale.title')}
          className="mt-3 grid grid-cols-2 gap-2"
        >
          {LOCALES.map(({ locale: loc, labelKey }) => {
            const active = locale === loc;
            return (
              <button
                key={loc}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => void setUserLocale(uid, loc)}
                className={cn(
                  'rounded-card-sm border p-3 text-center transition-all duration-200 ease-base',
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
              </button>
            );
          })}
        </div>
      </section>

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

        {/*
          Réglage d'APPAREIL et non de compte : il vit dans `localStorage`, pas
          dans `users/{uid}` (cf. `slices/device-prefs-slice.ts`). Un joueur qui
          coupe la vibration de son téléphone à la table ne veut pas couper
          quoi que ce soit sur son portable — et l'un des deux n'a de toute
          façon pas de moteur de vibration.
        */}
        <label className="mt-3 flex items-start justify-between gap-3 rounded-card-sm border border-white-8 bg-white/[0.02] p-3">
          <span className="min-w-0">
            <span className="block font-title text-[11px] font-bold uppercase tracking-[0.16em] text-text-secondary">
              {t('account.haptics.title')}
            </span>
            <span className="mt-0.5 block font-serif text-[12px] text-text-tertiary">
              {t('account.haptics.hint')}
            </span>
          </span>
          <input
            type="checkbox"
            checked={haptics}
            onChange={(e) => setHaptics(e.target.checked)}
            aria-label={t('account.haptics.title')}
            className="mt-1 h-5 w-5 flex-shrink-0 accent-gold-bright"
          />
        </label>

        {/* Ne coupe que les ANNONCES, pas le bandeau « à toi de jouer » de la
            fiche : celui-ci n'interrompt rien, et le taire rendrait le joueur
            aveugle à son tour au lieu de le laisser tranquille. */}
        <label className="mt-3 flex items-start justify-between gap-3 rounded-card-sm border border-white-8 bg-white/[0.02] p-3">
          <span className="min-w-0">
            <span className="block font-title text-[11px] font-bold uppercase tracking-[0.16em] text-text-secondary">
              {t('account.notifications.title')}
            </span>
            <span className="mt-0.5 block font-serif text-[12px] text-text-tertiary">
              {t('account.notifications.hint')}
            </span>
          </span>
          <input
            type="checkbox"
            checked={gameNotifications}
            onChange={(e) => setGameNotifications(e.target.checked)}
            aria-label={t('account.notifications.title')}
            className="mt-1 h-5 w-5 flex-shrink-0 accent-gold-bright"
          />
        </label>

        {/* Réglage d'appareil au même titre que l'haptique : la culbute 3D se
            sent sur un vieux téléphone alors qu'elle ne coûte rien ailleurs. */}
        <label className="mt-3 flex items-start justify-between gap-3 rounded-card-sm border border-white-8 bg-white/[0.02] p-3">
          <span className="min-w-0">
            <span className="block font-title text-[11px] font-bold uppercase tracking-[0.16em] text-text-secondary">
              {t('account.dice3d.title')}
            </span>
            <span className="mt-0.5 block font-serif text-[12px] text-text-tertiary">
              {t('account.dice3d.hint')}
            </span>
          </span>
          <input
            type="checkbox"
            checked={dice3d}
            onChange={(e) => setDice3d(e.target.checked)}
            aria-label={t('account.dice3d.title')}
            className="mt-1 h-5 w-5 flex-shrink-0 accent-gold-bright"
          />
        </label>
      </section>
    </Card>
  );
}

/**
 * Point d'entrée nav vers l'import de contenu personnalisé (`/account/content`).
 * L'écran d'import était jusqu'ici orphelin (route déclarée, « accessible par URL
 * directe en V1, un point d'entrée nav-shell viendra plus tard » — cf. routes.tsx).
 * Le losange avatar du NavShell mène à `/account` : cette carte est donc l'entrée
 * nav-shell anticipée. Carte tappable pleine largeur (affordance NavHub) plutôt
 * qu'un simple lien texte, car la gestion de packs est un espace, pas une action.
 */
function CustomContentCard(): JSX.Element {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate('/account/content')}
      className={cn(
        'group flex w-full items-center gap-4 rounded-card border border-soft bg-glass p-5 text-left',
        'transition-all duration-200 ease-base hover:-translate-y-px hover:border-gold-dim/60',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40',
      )}
    >
      <span
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-card-sm border border-white-8 bg-white/[0.04] text-gold-bright transition-colors duration-200 ease-base group-hover:border-gold-dim/60"
        aria-hidden="true"
      >
        <Icon name="i-feather" className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-body font-bold uppercase tracking-[0.14em] text-gold-bright">
          {t('account.content.title')}
        </span>
        <span className="mt-1 block font-serif text-body-sm text-text-tertiary">
          {t('account.content.hint')}
        </span>
      </span>
      <span
        className="font-title text-[11px] font-bold uppercase tracking-[0.16em] text-text-secondary transition-colors duration-200 ease-base group-hover:text-gold-bright"
        aria-hidden="true"
      >
        {t('account.content.cta')}
      </span>
    </button>
  );
}

/**
 * Traduit un code d'erreur Firebase Auth en message utilisateur. Les codes non
 * mappés retombent sur un message générique (jamais de code brut à l'écran).
 * Exporté pour test unitaire (fonction pure).
 */
export function linkErrorMessage(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code)
      : '';
  switch (code) {
    case 'auth/email-already-in-use':
      return t('account.link.error.emailInUse');
    case 'auth/credential-already-in-use':
    case 'auth/provider-already-linked':
      return t('account.link.error.credentialInUse');
    case 'auth/weak-password':
      return t('account.link.error.weakPassword');
    case 'auth/invalid-email':
      return t('account.link.error.invalidEmail');
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/popup-blocked':
      return t('account.link.error.popupClosed');
    default:
      return t('account.link.error.generic');
  }
}

const MIN_PASSWORD = 6;

/**
 * Carte « Sauvegarder ton compte » — visible uniquement pour un utilisateur
 * anonyme. Comble la voie sans issue signalée par l'audit : le profil invitait
 * à « lier un compte » sans qu'aucune UI ne le permette, exposant à une perte
 * de données silencieuse (usage principal = un téléphone hors-ligne).
 *
 * Deux voies : Google (popup) et e-mail/mot de passe. `useAuth` pousse le user
 * lié dans le store après succès → la carte se démonte d'elle-même (isAnonymous
 * bascule) et le profil se met à jour, sans reload.
 */
function LinkAccountCard(): JSX.Element {
  const { linkToGoogle, linkToEmail } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [busy, setBusy] = useState<'google' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle(): Promise<void> {
    if (busy) return;
    setError(null);
    setBusy('google');
    try {
      await linkToGoogle();
      showToast({ kind: 'info', title: t('account.link.success') });
    } catch (err) {
      setError(linkErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleEmail(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (password.length < MIN_PASSWORD) {
      setError(t('account.link.error.weakPassword'));
      return;
    }
    setBusy('email');
    try {
      await linkToEmail(email.trim(), password);
      showToast({ kind: 'info', title: t('account.link.success') });
    } catch (err) {
      setError(linkErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const inputClass = cn(
    'w-full rounded-card-sm border border-white-8 bg-bg-3/40 px-3 py-2',
    'font-serif text-body text-text placeholder:text-text-tertiary',
    'focus:border-gold-bright focus:outline-none focus:ring-1 focus:ring-gold-bright/40',
    'transition-colors duration-200 ease-base disabled:opacity-50',
  );

  return (
    <Card>
      <CardHeader>
        <h3>{t('account.link.title')}</h3>
      </CardHeader>
      <p className="font-serif text-body-sm text-text-secondary">
        {t('account.link.hint')}
      </p>

      <Button
        variant="secondary"
        size="md"
        onClick={() => void handleGoogle()}
        disabled={busy !== null}
        className="mt-4 w-full"
      >
        {busy === 'google' ? t('account.link.linking') : t('account.link.google')}
      </Button>

      <div className="my-4 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-white-8" />
        <span className="font-title text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
          {t('account.link.or')}
        </span>
        <span className="h-px flex-1 bg-white-8" />
      </div>

      <form onSubmit={(e) => void handleEmail(e)} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-title text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">
            {t('account.link.emailLabel')}
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('account.link.emailPlaceholder')}
            disabled={busy !== null}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-title text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">
            {t('account.link.passwordLabel')}
          </span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('account.link.passwordPlaceholder')}
            disabled={busy !== null}
            className={inputClass}
          />
        </label>

        {error ? (
          <p
            role="alert"
            className="rounded-card-sm border border-crimson/40 bg-crimson/[0.08] px-3 py-2 font-serif text-body-sm text-crimson"
          >
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="primary" size="md" disabled={busy !== null}>
          {busy === 'email' ? t('account.link.linking') : t('account.link.emailCta')}
        </Button>
      </form>
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
