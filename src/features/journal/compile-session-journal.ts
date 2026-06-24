import type { LinkedMember } from '@/features/campaigns/use-encounter-party-draft';
import { listSessionEvents, updateSessionJournal } from '@/shared/lib/services/sessions';
import type { I18nString } from '@/shared/lib/i18n';

import { buildJournalContext } from './build-journal-context';
import { compileJournal } from './compiler';
import { resolveJournalCharacterNames } from './resolve-journal-names';

interface NamedContent {
  id: string;
  name: I18nString;
}

export interface CompileSessionJournalArgs {
  campaignId: string;
  sessionId: string;
  linkedMembers: readonly LinkedMember[];
  spells: readonly NamedContent[];
  items: readonly NamedContent[];
  conditions: readonly NamedContent[];
}

/**
 * Orchestre la compilation du journal d'une séance (plan 25.2) et la persiste :
 *   1. lit les events de la séance (`all` + `dm`, ordonnés) ;
 *   2. résout les noms de personnages cités (cross-owner, isolé) ;
 *   3. construit le `JournalContext` (noms + contenu chargé) ;
 *   4. compile en Markdown FR (`compileJournal`, pur) ;
 *   5. écrit `journalCompiled` sur le doc séance.
 *
 * Renvoie la chaîne compilée pour que l'appelant rafraîchisse l'UI sans relire.
 * Utilisé à la clôture de séance ET par le bouton « Compiler / Re-compiler » du
 * MJ. Les écritures (rule `update : isDMOf`) supposent un appelant MJ.
 */
export async function compileSessionJournal(args: CompileSessionJournalArgs): Promise<string> {
  const events = await listSessionEvents(args.campaignId, args.sessionId);
  const characterNames = await resolveJournalCharacterNames(events, args.linkedMembers);
  const ctx = buildJournalContext({
    characterNames,
    spells: args.spells,
    items: args.items,
    conditions: args.conditions,
  });
  const markdown = compileJournal(events, ctx);
  await updateSessionJournal(args.campaignId, args.sessionId, markdown);
  return markdown;
}
