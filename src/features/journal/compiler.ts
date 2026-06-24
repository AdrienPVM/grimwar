import { t } from '@/shared/lib/i18n';
import type { GameEvent } from '@/shared/types/event';

import type { JournalContext } from './templates';
import { renderEventLine } from './templates';
import { payloadString } from './templates/payload';

/**
 * Compilateur de journal (plan 25.1, step 3) — PUR, sans I/O.
 *
 * Entrée : la liste ORDONNÉE (`createdAt ASC`) des événements d'une séance + un
 * contexte de résolution d'identité (`JournalContext`). Sortie : une chaîne
 * Markdown (titres H2 + lignes à puces de prose FR).
 *
 * Groupage (step 3) : on segmente le flux par `encounterId`. Une suite
 * d'événements partageant le même `encounterId` non nul forme une section
 * « ## Combat — {nom} » ; les événements sans `encounterId` tombent dans une
 * section « ## Exploration ». Les segments apparaissent dans l'ORDRE
 * CHRONOLOGIQUE de leur premier événement — une séance réelle alterne
 * exploration et combats, le journal reflète cette alternance plutôt que de
 * regrouper artificiellement tous les combats à la fin.
 *
 * Le compilateur ne lit jamais Firestore ni le contenu SRD : toute résolution
 * d'identité passe par `ctx`. Il est donc déterministe et testable en isolation.
 */

interface Segment {
  /** `encounterId` du segment, ou `null` pour l'exploration. */
  encounterId: string | null;
  events: GameEvent[];
}

/** Segmente le flux ordonné par `encounterId` (changement = nouveau segment). */
function segmentByEncounter(events: GameEvent[]): Segment[] {
  const segments: Segment[] = [];
  for (const event of events) {
    const last = segments[segments.length - 1];
    if (last && last.encounterId === event.encounterId) {
      last.events.push(event);
    } else {
      segments.push({ encounterId: event.encounterId, events: [event] });
    }
  }
  return segments;
}

/** Titre de section d'un combat : nom porté par l'`encounter-start` du segment. */
function combatTitle(segment: Segment): string {
  const start = segment.events.find((e) => e.kind === 'encounter-start');
  const name = start ? payloadString(start.payload, 'name') : '';
  return t('journal.section.combat').replace('{name}', name || t('journal.section.exploration'));
}

/** Pied de section d'un combat : issue portée par l'`encounter-end`, ou rien. */
function combatOutcomeLine(segment: Segment): string | null {
  const end = segment.events.find((e) => e.kind === 'encounter-end');
  if (!end) return null;
  const outcome = payloadString(end.payload, 'outcome');
  if (outcome === 'victory') return t('journal.section.combatOutcome.victory');
  if (outcome === 'defeat') return t('journal.section.combatOutcome.defeat');
  if (outcome === 'fled') return t('journal.section.combatOutcome.fled');
  return null;
}

/** Rend les lignes à puces d'un segment (events → prose, `null` ignorés). */
function renderLines(events: GameEvent[], ctx: JournalContext): string[] {
  const lines: string[] = [];
  for (const event of events) {
    const line = renderEventLine(event, ctx);
    if (line) lines.push(`- ${line}`);
  }
  return lines;
}

/**
 * Compile les événements d'une séance en un document Markdown FR.
 *
 * Une séance sans aucun événement (ou dont tous les événements sont muets)
 * produit le repli `journal.empty` — jamais une chaîne vide trompeuse.
 */
export function compileJournal(events: GameEvent[], ctx: JournalContext): string {
  if (events.length === 0) return t('journal.empty');

  const blocks: string[] = [];

  for (const segment of segmentByEncounter(events)) {
    const isCombat = segment.encounterId !== null;
    const title = isCombat ? combatTitle(segment) : t('journal.section.exploration');
    const lines = renderLines(segment.events, ctx);
    const outcome = isCombat ? combatOutcomeLine(segment) : null;

    // Un segment dont toutes les lignes sont muettes ET sans issue n'ajoute
    // rien (ex. un combat réduit à start+end sans tour ni dégât journalisé en
    // exploration produirait une section vide — on la saute).
    if (lines.length === 0 && !outcome) continue;

    const body = [...lines];
    if (outcome) body.push(`\n${outcome}`);
    blocks.push(`## ${title}\n\n${body.join('\n')}`);
  }

  // Tous les segments muets → repli explicite plutôt qu'une chaîne vide.
  if (blocks.length === 0) return t('journal.empty');

  return blocks.join('\n\n');
}
