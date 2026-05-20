/**
 * scripts/check-content-build-idempotence.ts (plan 13.10b — D17, commit 1)
 *
 * Garde-fou rouge-puis-vert du critère DUR de D17 : exécuter la commande de
 * régénération du bundle (`pnpm content:build`) sur l'état committé doit
 * produire **zéro diff** dans `public/data`.
 *
 *   - Commit 1 (build-public-content obsolète/destructif)  → ROUGE (exit 1).
 *   - Commit 2 (orchestrateur + generatedAt stable)        → VERT  (exit 0).
 *
 * Pourquoi un script et pas un test Vitest : faire tourner le build EN PLACE
 * mute `public/data` pendant la durée du build. La suite Vitest (`pool: forks`)
 * lit `public/data` en parallèle dans d'autres specs (content-referential-
 * integrity, srd-counters…) — un build in-place dans la suite ferait flaker ces
 * specs. Ce check vit donc hors `pnpm test`, câblé sur la DoD (`pnpm content:check`).
 *
 * Sécurité : refuse de tourner si `public/data` a des changements non-committés
 * (le restore final est un `git checkout -- public/data`, qui écraserait du
 * travail non sauvegardé). Restaure TOUJOURS l'état initial, même en cas d'échec.
 *
 * Run : `pnpm content:check`
 */
import { execFileSync } from 'node:child_process';

const TARGET = 'public/data';

function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf-8' }).trim();
}

function dirtyTarget(): boolean {
  // --porcelain : lignes non vides = changements (staged ou non) sous TARGET.
  return git(['status', '--porcelain', '--', TARGET]).length > 0;
}

function main(): void {
  if (dirtyTarget()) {
    console.error(
      `[content:check] ABORT — ${TARGET} a des changements non-committés.\n` +
        `Ce check restaure via 'git checkout -- ${TARGET}' et écraserait ton travail.\n` +
        `Commit ou stash d'abord, puis relance.`,
    );
    process.exit(2);
  }

  let buildFailed = false;
  try {
    // Même invocation que la DoD : la commande de régénération canonique.
    // En commit 1, build-public-content sort en code 1 (erreurs Zod) — on ne
    // s'en sert pas comme verdict, le verdict est le diff. On capture quand même.
    execFileSync('pnpm', ['content:build'], { stdio: 'inherit' });
  } catch {
    buildFailed = true;
  }

  const diff = git(['status', '--porcelain', '--', TARGET]);
  const idempotent = diff.length === 0;

  // Restauration inconditionnelle de l'état committé.
  git(['checkout', '--', TARGET]);

  if (idempotent) {
    console.log(`\n[content:check] ✅ VERT — content:build idempotent (zéro diff sur ${TARGET}).`);
    process.exit(0);
  }

  console.error(
    `\n[content:check] 🔴 ROUGE — content:build N'EST PAS idempotent.\n` +
      (buildFailed ? `(le build a aussi sorti en code ≠ 0)\n` : '') +
      `Fichiers divergents (restaurés depuis HEAD) :\n${diff}`,
  );
  process.exit(1);
}

main();
