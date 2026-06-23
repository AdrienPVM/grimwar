import type { Character, InventoryItem } from '@/shared/types/character';
import type { NewGameEvent } from '@/shared/types/event';

/**
 * Diff de fiche → événements de journal (plan 22.2).
 *
 * Fonction PURE : prend l'état AVANT (`before`) et le patch partiel envoyé à
 * Firestore, et dérive la liste des événements de gameplay à journaliser. Aucun
 * accès Firestore / store ici — l'event-logger (`logCharacterDiff`) écrit chaque
 * événement retourné. Testable en isolation (cf. character-diff.test.ts).
 *
 * Périmètre 22.2 (cf. plan 22 step 3) : `hp.current` / `hp.temp`, `conditions`,
 * `spellSlots`, `inventory.items`. Volontairement HORS périmètre :
 *   - `level` / `totalLevel` → `level-up` attend plan 18 (le wizard de montée
 *     de niveau passe `{ log: 'manual' }` pour ne pas produire de bruit) ;
 *   - `coins`, `equipped`/`attuned` → kinds dédiés (coins-change, item-equipped…)
 *     portés par un plan ultérieur ;
 *   - une consommation de slot par lancement de sort est journalisée en
 *     `spell-cast` (qui porte `slotConsumed`), PAS en `slot-consumed` : le call
 *     site de cast passe `{ log: 'manual' }` puis appelle `logSpellCast`.
 *
 * Toutes les visibilités sont `all` (cf. table docs/EVENT-LOG.md).
 */

/**
 * Clé d'identité d'une ligne d'inventaire pour le diff. On combine scope +
 * source + id : deux items de même `contentId` mais de scopes différents
 * (public vs campagne) sont distincts ; un changement de `qty` sur la même clé
 * est un acquire/remove partiel.
 */
function itemKey(it: InventoryItem): string {
  return `${it.contentScope}|${it.contentSource ?? ''}|${it.contentId}`;
}

export function diffCharacterEvents(
  before: Character,
  patch: Partial<Character>,
  characterId: string,
): NewGameEvent[] {
  const events: NewGameEvent[] = [];
  const base = { actorCharacterId: characterId || null, visibility: 'all' as const };

  // ── PV ───────────────────────────────────────────────────────────────────
  if (patch.hp) {
    if (patch.hp.current !== before.hp.current) {
      const delta = patch.hp.current - before.hp.current;
      events.push({
        ...base,
        kind: 'hp-change',
        payload: {
          before: before.hp.current,
          after: patch.hp.current,
          delta,
          reason: delta < 0 ? 'damage' : 'heal',
          source: 'manual',
        },
      });
    }
    // PV temporaires : seul le GAIN est un événement de plein droit. Une perte
    // de PV temp. provient de l'absorption de dégâts (couverte par hp-change).
    if (patch.hp.temp > before.hp.temp) {
      events.push({
        ...base,
        kind: 'temp-hp',
        payload: { before: before.hp.temp, after: patch.hp.temp, source: 'manual' },
      });
    }
  }

  // ── États ──────────────────────────────────────────────────────────────
  if (patch.conditions) {
    const beforeSet = new Set(before.conditions);
    const afterSet = new Set(patch.conditions);
    for (const conditionId of patch.conditions) {
      if (!beforeSet.has(conditionId)) {
        events.push({
          ...base,
          kind: 'condition-add',
          payload: { conditionId, source: 'manual' },
        });
      }
    }
    for (const conditionId of before.conditions) {
      if (!afterSet.has(conditionId)) {
        events.push({ ...base, kind: 'condition-remove', payload: { conditionId } });
      }
    }
  }

  // ── Emplacements de sort ─────────────────────────────────────────────────
  if (patch.spellSlots) {
    for (const [lvl, slot] of Object.entries(patch.spellSlots)) {
      const prev = before.spellSlots[lvl]?.current ?? 0;
      const delta = slot.current - prev;
      if (delta < 0) {
        events.push({
          ...base,
          kind: 'slot-consumed',
          payload: { slotLevel: Number(lvl), count: -delta, source: 'manual' },
        });
      } else if (delta > 0) {
        events.push({
          ...base,
          kind: 'slot-restored',
          payload: { slotLevel: Number(lvl), count: delta, source: 'manual' },
        });
      }
    }
  }

  // ── Inventaire ─────────────────────────────────────────────────────────
  if (patch.inventory?.items) {
    const beforeMap = new Map(before.inventory.items.map((it) => [itemKey(it), it]));
    const afterMap = new Map(patch.inventory.items.map((it) => [itemKey(it), it]));
    for (const [key, it] of afterMap) {
      const prev = beforeMap.get(key);
      if (!prev) {
        events.push({
          ...base,
          kind: 'item-acquired',
          payload: { itemRef: it.contentId, contentScope: it.contentScope, qty: it.qty, source: 'manual' },
        });
      } else if (it.qty > prev.qty) {
        events.push({
          ...base,
          kind: 'item-acquired',
          payload: {
            itemRef: it.contentId,
            contentScope: it.contentScope,
            qty: it.qty - prev.qty,
            source: 'manual',
          },
        });
      }
    }
    for (const [key, it] of beforeMap) {
      const next = afterMap.get(key);
      if (!next) {
        events.push({
          ...base,
          kind: 'item-removed',
          payload: { itemRef: it.contentId, contentScope: it.contentScope, qty: it.qty, reason: 'manual' },
        });
      } else if (next.qty < it.qty) {
        events.push({
          ...base,
          kind: 'item-removed',
          payload: {
            itemRef: it.contentId,
            contentScope: it.contentScope,
            qty: it.qty - next.qty,
            reason: 'manual',
          },
        });
      }
    }
  }

  return events;
}
