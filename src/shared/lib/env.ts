/**
 * Validation au chargement des variables d'environnement Vite.
 * Échoue tôt et clairement si une clé requise manque, plutôt que d'attendre
 * un crash Firebase opaque plus loin dans l'app.
 */

type RawEnv = ImportMetaEnv & Record<string, string | undefined>;

const raw = import.meta.env as RawEnv;

function required(key: string): string {
  const value = raw[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(
      `[env] Variable manquante : ${key}. Copier .env.example → .env.local et remplir.`,
    );
  }
  return value;
}

function optional(key: string): string | undefined {
  const value = raw[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export const env = {
  firebase: {
    apiKey: required('VITE_FIREBASE_API_KEY'),
    authDomain: required('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: required('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: required('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: required('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: required('VITE_FIREBASE_APP_ID'),
    measurementId: optional('VITE_FIREBASE_MEASUREMENT_ID'),
  },
  // App Check est optionnel : si absent, on log un warning et on continue.
  // À activer avant déploiement public (plan 13).
  recaptchaSiteKey: optional('VITE_RECAPTCHA_SITE_KEY'),
} as const;

export type Env = typeof env;
