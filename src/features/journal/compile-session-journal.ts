import type { LinkedMember } from '@/features/campaigns/use-encounter-party-draft';
import { listSessionEvents, updateSessionJournal } from '@/shared/lib/services/sessions';
import type { I18nString } from '@/shared/lib/i18n';
import type { EventKind, GameEvent } from '@/shared/types/event';

import { buildJournalContext } from './build-journal-context';
import { compileJournal } from './compiler';
import { resolveJournalCharacterNames } from './resolve-journal-names';

interface NamedContent {
  id: string;
  name: I18nString;
}

/**
 * Cadrage de la compilation (M14 de l'audit de malléabilité). Le journal avalait
 * TOUT ce que `listSessionEvents` retourne : les 40 jets de dés d'un combat, les
 * PV exacts de chaque monstre, et les coulisses du meneur.
 *
 * Le filtrage s'applique AVANT `compileJournal` — le compilateur reste pur et ne
 * connaît rien de ces options. Défauts choisis pour ZÉRO régression : sans
 * options, on compile exactement comme avant.
 */
export interface JournalCompileOptions {
  /** Kinds retirés du récit (`roll`, `monster-hp-change`…). Vide par défaut. */
  excludedKinds?: readonly EventKind[];
  /** Inclure les événements `visibility: 'dm'`. `true` par défaut. */
  includeDmOnly?: boolean;
}

/**
 * Retire du flux les événements que le meneur ne veut pas raconter. PUR et
 * exporté pour test — c'est la seule pièce de M14 qui décide de ce qui entre
 * dans le récit.
 */
export function filterJournalEvents(
  events: readonly GameEvent[],
  options: JournalCompileOptions = {},
): GameEvent[] {
  const excluded = new Set<EventKind>(options.excludedKinds ?? []);
  const includeDm = options.includeDmOnly ?? true;
  return events.filter((event) => {
    if (excluded.has(event.kind)) return false;
    if (!includeDm && event.visibility === 'dm') return false;
    return true;
  });
}

export interface CompileSessionJournalArgs {
  campaignId: string;
  sessionId: string;
  linkedMembers: readonly LinkedMember[];
  spells: readonly NamedContent[];
  items: readonly NamedContent[];
  conditions: readonly NamedContent[];
  /** Cadrage du récit (M14). Absent → comportement d'origine, tout inclus. */
  options?: JournalCompileOptions;
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
  const allEvents = await listSessionEvents(args.campaignId, args.sessionId);
  // Filtrage AVANT la résolution des noms : un événement écarté n'a pas à
  // déclencher une lecture cross-owner de fiche pour un nom qui ne sera pas rendu.
  const events = filterJournalEvents(allEvents, args.options);
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
