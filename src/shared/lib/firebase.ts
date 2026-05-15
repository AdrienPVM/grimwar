/**
 * Bootstrap Firebase + helpers d'authentification.
 *
 * Pourquoi un module dédié : on encapsule l'init (app, auth, firestore, app-check,
 * persistence) pour que les autres features importent juste `auth` / `db` /
 * les helpers, sans réinitialiser.
 *
 * App Check : optionnel tant que VITE_RECAPTCHA_SITE_KEY est vide. À activer
 * avant déploiement public (plan 13).
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  EmailAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  sendEmailVerification as fbSendEmailVerification,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  setPersistence,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  enableIndexedDbPersistence,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import {
  ReCaptchaV3Provider,
  initializeAppCheck,
  type AppCheck,
} from 'firebase/app-check';

import { env } from './env';

let cachedApp: FirebaseApp | undefined;
let cachedAuth: Auth | undefined;
let cachedDb: Firestore | undefined;
let cachedAppCheck: AppCheck | undefined;

function ensureApp(): FirebaseApp {
  if (!cachedApp) {
    cachedApp = initializeApp(env.firebase);
    initAppCheck(cachedApp);
  }
  return cachedApp;
}

function initAppCheck(app: FirebaseApp): void {
  if (cachedAppCheck) return;
  if (!env.recaptchaSiteKey) {
    console.warn(
      '[firebase] App Check désactivé (VITE_RECAPTCHA_SITE_KEY absente). ' +
        'Activer reCAPTCHA v3 avant déploiement public.',
    );
    return;
  }
  cachedAppCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(env.recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export function getFirebaseAuth(): Auth {
  if (!cachedAuth) {
    cachedAuth = getAuth(ensureApp());
    // setPersistence est async ; on retourne immédiatement, la promesse se
    // résout avant le premier sign-in puisqu'on l'attend dans
    // signInAnonymouslyAndPersist.
  }
  return cachedAuth;
}

export function getDb(): Firestore {
  if (!cachedDb) {
    cachedDb = getFirestore(ensureApp());
    // Persistence offline : best-effort. Échec attendu si plusieurs onglets
    // ouverts ou si le navigateur ne supporte pas IndexedDB.
    enableIndexedDbPersistence(cachedDb).catch((err: unknown) => {
      const code = (err as { code?: string }).code;
      if (code === 'failed-precondition') {
        console.warn(
          '[firestore] Persistence indisponible (onglet multiple). Lecture/écriture ' +
            'online uniquement.',
        );
      } else if (code === 'unimplemented') {
        console.warn(
          '[firestore] Navigateur sans support IndexedDB. Mode offline désactivé.',
        );
      } else {
        console.error('[firestore] Échec activation persistence', err);
      }
    });
  }
  return cachedDb;
}

async function ensurePersistence(): Promise<Auth> {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
  return auth;
}

export async function signInAnonymouslyAndPersist(): Promise<User> {
  const auth = await ensurePersistence();
  const cred = await signInAnonymously(auth);
  return cred.user;
}

export async function signInWithGoogle(): Promise<User> {
  const auth = await ensurePersistence();
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const auth = await ensurePersistence();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const auth = await ensurePersistence();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // Envoi automatique du mail de vérification pour ne pas laisser de comptes orphelins.
  await fbSendEmailVerification(cred.user);
  return cred.user;
}

export async function linkAnonymousToGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  const current = auth.currentUser;
  if (!current) throw new Error('[auth] Aucun utilisateur courant à lier.');
  const provider = new GoogleAuthProvider();
  const cred = await linkWithPopup(current, provider);
  return cred.user;
}

export async function linkAnonymousToEmail(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  const current = auth.currentUser;
  if (!current) throw new Error('[auth] Aucun utilisateur courant à lier.');
  const credential = EmailAuthProvider.credential(email, password);
  const linked = await linkWithCredential(current, credential);
  await fbSendEmailVerification(linked.user);
  return linked.user;
}

export async function signOutCurrentUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  await fbSendPasswordResetEmail(auth, email);
}

export async function sendEmailVerification(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('[auth] Aucun utilisateur courant pour vérification email.');
  await fbSendEmailVerification(user);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

export type { User };
