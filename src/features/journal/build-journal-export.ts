import type { Session } from '@/shared/types/session';

/**
 * Construit le document Markdown d'export du journal de campagne (plan 25.4,
 * step 8) — PUR. Concatène, dans l'ordre chronologique fourni, le journal
 * compilé de chaque séance sous un titre H1 « Séance N — Titre ».
 *
 * Les séances sans `journalCompiled` sont incluses avec une note (le MJ voit
 * qu'elles existent mais n'ont pas été compilées). Le titre de campagne ouvre le
 * document en H1 ; chaque séance est un H2 (le contenu compilé utilise déjà des
 * H2 pour ses sections — on garde la hiérarchie : campagne H1 > séance H2 >
 * sections du compilé restent en H2, acceptable pour un export plat lisible).
 *
 * `sessions` doit déjà être filtré/ordonné par l'appelant (séances terminées,
 * chronologique). On ne refiltre pas ici — fonction de présentation pure.
 */
export function buildJournalExport(
  campaignName: string,
  sessions: readonly Session[],
  labels: { sessionPrefix: string; notCompiled: string },
): string {
  const header = `# ${campaignName}\n`;
  if (sessions.length === 0) return header;

  const blocks = sessions.map((s) => {
    const title = `## ${labels.sessionPrefix}${s.number} — ${s.title}`;
    const body =
      s.journalCompiled && s.journalCompiled.trim().length > 0
        ? s.journalCompiled.trim()
        : `_${labels.notCompiled}_`;
    return `${title}\n\n${body}`;
  });

  return `${header}\n${blocks.join('\n\n')}\n`;
}

/**
 * Nom de fichier d'export sûr à partir du nom de campagne : minuscules,
 * non-alphanumériques → tirets, bornes nettoyées, repli `journal`. Suffixe
 * `-journal.md`.
 */
export function journalExportFilename(campaignName: string): string {
  // NFD décompose les lettres accentuées (é → e + U+0301) ; on retire d'abord
  // les marques combinantes (̀-ͯ) pour ne pas couper « brisée » en
  // « brise-e », puis on remplace la ponctuation restante par des tirets.
  const slug = campaignName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'journal'}-journal.md`;
}
