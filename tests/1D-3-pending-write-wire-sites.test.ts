import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

/**
 * JALON 1D.3 — câblage `trackPendingWrite` sur les 3 sites d'écriture
 * Firestore initiés par l'utilisateur en V1.
 *
 * Pourquoi un source-test plutôt qu'un test unitaire par site :
 * - Les 3 sites sont des coquilles minces autour de `setDoc` ; mocker
 *   `firebase/firestore` + Zustand + le contexte d'auth dans chaque test
 *   ferait plus de bruit que de signal.
 * - Le risque ciblé est régressif : qu'un futur refactor RETIRE un appel à
 *   `trackPendingWrite` (ex. extraction d'un helper qui oublierait le
 *   wrapper) sans casser le test unitaire isolé. Un source-test attrape
 *   exactement cette classe de bug.
 * - Pattern « rendre la classe de bug structurellement impossible » : si un
 *   site ajoute un setDoc sans trackPendingWrite, ce test échoue.
 *
 * Périmètre V1 1D.3 : 3 sites d'écriture user-initiated identifiés par
 * recensement `setDoc` / `updateDoc` :
 * 1. `wizard/submit-from-wizard.ts` — création de personnage (terminal)
 * 2. `sheet/use-character.ts` — migration v1→v2 character (auto-upgrade)
 * 3. `sheet/modes/avoir/custom-item-form.tsx` — création d'item custom
 *
 * (Les écritures backend internes — eg. cache invalidation — ne comptent
 * pas comme « écritures user-initiated » et ne sont pas trackées.)
 */

const WIRE_SITES: ReadonlyArray<{
  readonly path: string;
  readonly label: string;
}> = [
  {
    path: 'src/features/wizard/submit-from-wizard.ts',
    label: 'création de personnage (wizard)',
  },
  {
    path: 'src/features/sheet/use-character.ts',
    label: 'migration v1→v2 character (sheet bootstrap)',
  },
  {
    path: 'src/features/sheet/modes/avoir/custom-item-form.tsx',
    label: 'création item custom (avoir mode)',
  },
];

describe('JALON 1D.3 — `trackPendingWrite` câblé sur les 3 sites d\'écriture user-initiated', () => {
  for (const site of WIRE_SITES) {
    it(`${site.path} importe et invoque trackPendingWrite (${site.label})`, async () => {
      const source = await readFile(site.path, 'utf-8');

      // Garde 1 — import présent. Attrape un retrait accidentel de l'import
      // lors d'un refactor d'imports automatique.
      expect(
        source,
        `${site.path}: import manquant pour trackPendingWrite`,
      ).toMatch(/from ['"]@\/shared\/lib\/track-pending-write['"]/);

      // Garde 2 — invocation présente. Attrape un retrait du wrapper autour
      // de l'écriture (l'import resterait alors mais inutilisé).
      expect(
        source,
        `${site.path}: aucun appel à trackPendingWrite(...)`,
      ).toMatch(/trackPendingWrite\s*\(/);
    });
  }

  it('aucun nouveau site d\'écriture user-initiated n\'oublie `trackPendingWrite`', async () => {
    // Garde-fou anti-régression : énumère TOUS les fichiers app qui appellent
    // `setDoc(` ou `updateDoc(` et exige que chacun importe également
    // `track-pending-write`. Si un futur plan ajoute une écriture Firestore
    // sans wrapper, ce test échoue avec le path en clair.
    //
    // Exemptions documentées :
    // - `track-pending-write.ts` lui-même (c'est le wrapper)
    // - `firebase.ts` (boot du SDK, pas d'écriture user)
    // - tests __tests__ (mocks)
    // - migrations / outils CLI hors UI (none for now)

    const { execSync } = await import('node:child_process');
    // `git ls-files` pour ne scanner que les fichiers versionnés (zéro
    // dépendance de glob, pas de surprise sur node_modules).
    const tracked = execSync(
      'git ls-files "src/**/*.ts" "src/**/*.tsx"',
      { encoding: 'utf-8' },
    )
      .split('\n')
      .filter(Boolean);

    const EXEMPT_PATTERNS = [
      /__tests__\//,
      /\.test\.tsx?$/,
      /shared\/lib\/track-pending-write\.ts$/,
    ];

    // Strip block + ligne comments AVANT de scanner. Sinon un simple
    // `// describe `setDoc(...)`` en JSDoc fait passer ce fichier en violation
    // alors qu'il n'écrit rien (cas réel : `use-map.ts` décrit le SDK dans
    // son header). Strip dans cet ordre : block `/* */` d'abord, sinon une
    // accolade fermante dans un block peut ré-amorcer le scan ligne.
    const stripComments = (src: string): string =>
      src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

    const WRITE_FNS = ['setDoc', 'updateDoc', 'addDoc', 'deleteDoc'] as const;

    const violators: Array<{ path: string; reason: string }> = [];
    for (const path of tracked) {
      if (EXEMPT_PATTERNS.some((re) => re.test(path))) continue;
      let content: string;
      try {
        content = await readFile(path, 'utf-8');
      } catch {
        continue;
      }
      const stripped = stripComments(content);
      const calledFns = WRITE_FNS.filter((fn) =>
        new RegExp(`\\b${fn}\\s*\\(`).test(stripped),
      );
      if (calledFns.length === 0) continue;

      const wraps = /trackPendingWrite\s*\(/.test(stripped);
      if (!wraps) {
        violators.push({
          path,
          reason: `appelle ${calledFns.join('/')} sans trackPendingWrite`,
        });
      }
    }

    expect(
      violators,
      `Sites d'écriture sans tracking pending : \n${violators
        .map((v) => `  - ${v.path} (${v.reason})`)
        .join('\n')}\n\nSi cette écriture EST user-initiated → wrapper avec trackPendingWrite.\nSi elle ne l'est PAS (boot, migration interne, test) → ajouter une exemption motivée dans EXEMPT_PATTERNS.`,
    ).toEqual([]);
  });
});
