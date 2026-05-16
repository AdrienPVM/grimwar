import { SKILLS } from '@/shared/lib/rules/skills';

/**
 * Résout un nom de compétence (potentiellement bruité par l'extraction PDF —
 * « Na- ture », « In- sight », « Investi- gation »…) vers son ID kebab-case.
 *
 * `classes.json` et `backgrounds.json` exposent ces strings en EN, parfois avec
 * un tiret de coupure de mot qui n'a pas été nettoyé au build. On normalise ici
 * pour ne pas répandre la dette dans 5 composants. Le nettoyage à la source est
 * tracé dans `plans/DEBT.md` — quand le pipeline d'extraction sera corrigé,
 * ce résolveur restera comme garde-fou.
 */
export function resolveSkillId(rawName: string): string | null {
  const normalized = rawName
    .toLowerCase()
    .replace(/-\s+/g, '') // « Na- ture » → « nature »
    .replace(/\s+/g, ' ')
    .trim();
  const match = SKILLS.find((s) => {
    const enLower = (s.name.en ?? '').toLowerCase();
    const idLower = s.id.toLowerCase().replace(/-/g, ' ');
    return enLower === normalized || idLower === normalized;
  });
  return match ? match.id : null;
}

/** Filtre un tableau de strings → tableau d'IDs canoniques (skips inconnus). */
export function resolveSkillIds(rawNames: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of rawNames) {
    const id = resolveSkillId(raw);
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}
