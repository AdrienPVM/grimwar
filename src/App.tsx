import { AuthProvider } from '@/features/auth/auth-provider';
import { useAuth } from '@/features/auth/use-auth';
import { Aurora } from '@/shared/components/aurora';
import { IconSprite } from '@/shared/components/icon-sprite';
import { Particles } from '@/shared/components/particles';
import { SacredGeometry } from '@/shared/components/sacred-geometry';
import { HeroEmblem } from '@/features/sheet/hero/hero-emblem';
import { t } from '@/shared/lib/i18n';

/**
 * Coquille app : monte le sprite + l'ambiance + l'AuthProvider. Le splash
 * occupe l'écran tant que Firebase n'a pas résolu l'état initial (premier
 * onAuthStateChanged). Le contenu réel arrive en plan 04+.
 */
export function App(): JSX.Element {
  return (
    <AuthProvider>
      <IconSprite />
      <Aurora />
      <SacredGeometry />
      <Particles />
      <AppShell />
    </AuthProvider>
  );
}

function AppShell(): JSX.Element {
  const { isReady } = useAuth();
  if (!isReady) return <Splash />;

  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-24">
      <HeroEmblem hp={28} hpMax={32} letter="L" />
    </main>
  );
}

function Splash(): JSX.Element {
  return (
    <main
      className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 px-6"
      role="status"
      aria-live="polite"
    >
      <h1 className="font-display text-hero text-gold-bright drop-shadow-[0_0_24px_rgba(220,184,108,0.45)]">
        {t('splash.brand')}
      </h1>
      <p className="font-serif text-body-lg text-text-tertiary">{t('splash.loading')}</p>
    </main>
  );
}
