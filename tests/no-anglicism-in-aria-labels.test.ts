import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Garde-fou source : l'anglicisme « long-press » est banni des chaînes FR
 * visibles (aria-labels, libellés). Le guard `content-no-english-in-fr.test.ts`
 * ne scanne que `public/data/*.json` — il ne voit PAS les composants. Or des
 * aria-labels FR de la fiche disaient « long-press » au lieu de « appui long »
 * (la terminologie déjà utilisée dans les infobulles). On scanne donc le source.
 *
 * Cible volontairement les DEUX constructions propres aux libellés FR :
 *   - « long-press pour … » (ex. « long-press pour restaurer »)
 *   - « (long-press) » en suffixe
 * Ces formes n'apparaissent jamais dans les valeurs i18n EN (« long-press to
 * enter … ») ni dans les commentaires de code (« tap=action, long-press=… »),
 * donc zéro faux positif. Si tu ajoutes un libellé, écris « appui long ».
 */
const FORBIDDEN_FR_LONGPRESS = /long-press pour|\(long-press\)/;

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter(
      (e) =>
        e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx')),
    )
    .map((e) => path.join(e.parentPath, e.name));
}

describe('Anglicisme « long-press » interdit dans les chaînes FR visibles', () => {
  it('aucun composant ne dit « long-press pour … » ni « (long-press) » (utiliser « appui long »)', () => {
    const srcDir = path.resolve(__dirname, '..', 'src');
    const offenders: string[] = [];
    for (const file of collectSourceFiles(srcDir)) {
      const content = readFileSync(file, 'utf8');
      content.split('\n').forEach((line, i) => {
        if (FORBIDDEN_FR_LONGPRESS.test(line)) {
          offenders.push(`${path.relative(srcDir, file)}:${i + 1} → ${line.trim()}`);
        }
      });
    }
    expect(offenders, `Remplace « long-press » par « appui long » :\n${offenders.join('\n')}`).toEqual(
      [],
    );
  });
});
