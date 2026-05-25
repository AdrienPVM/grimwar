import type { Spell, SpellDamage } from '@/shared/types/content';

/**
 * Plan D1 — moteur de résolution des dégâts canoniques d'un sort.
 *
 * Prend une entrée `SpellDamage` brute du bundle SRD et un contexte de cast
 * (niveau d'emplacement choisi pour les sorts L1+, niveau de personnage pour
 * les cantrips) et retourne la formule **résolue** prête à rouler.
 *
 * **Patterns gérés :**
 *
 * 1. **Cantrip char-level scaling** (Fire Bolt, Sacred Flame, Eldritch
 *    Blast, etc.) — la formule de base vaut au tier 1 (L1-4). À partir des
 *    seuils SRD CC :
 *       L5  → `cantripScaling.tier5`
 *       L11 → `cantripScaling.tier11`
 *       L17 → `cantripScaling.tier17`
 *
 * 2. **Slot upcast** (Fireball, Magic Missile, Burning Hands, etc.) —
 *    `atHigherLevels.perLevel` est ajouté tel quel **par niveau au-dessus
 *    du niveau de base du sort**. La formule additive est concaténée à la
 *    formule de base avec un espace de présentation (« 8d6 + 2d6 » plutôt
 *    qu'une recomposition de dés — la concaténation reste lisible et
 *    rollable par `parseFormula`).
 *
 * 3. **Auto / condition** (Magic Missile, leap multi-cible) — le helper
 *    retourne juste la formule de base. La condition est portée par
 *    `damage.condition` et affichée par l'UI ; le scaling de quantité
 *    (nombre de projectiles, nombre de rayons) reste descriptif côté UI.
 *
 * **Non-objectif :** ce helper NE roule PAS les dés. Il retourne la
 * `formula` finale et le `type` ; le routage vers `useDice().rollDamageWithMode`
 * reste côté `SpellDetailModal`.
 */

/**
 * Niveau de caster minimal d'un seuil de scaling cantrip SRD CC (PHB p.10).
 * Source figée — si SRD bouge un jour, c'est ici qu'on l'aligne.
 */
const CANTRIP_TIER_THRESHOLDS = {
  tier5: 5,
  tier11: 11,
  tier17: 17,
} as const;

export interface ResolvedSpellDamage {
  /** Formule finale (« 8d6 », « 10d6 » après upcast L5 de Fireball, etc.). */
  readonly formula: string;
  /** Type de dégâts canonique (« fire », « lightning »…). */
  readonly type: SpellDamage['type'];
  /** Label i18n du type pour affichage direct. */
  readonly typeLabel: SpellDamage['typeLabel'];
  /** Mode de résolution attendu côté UI (jet d'attaque, save, auto). */
  readonly resolution?: SpellDamage['resolution'];
  /** Condition descriptive non encodable en formule (Magic Missile, leap…). */
  readonly condition?: SpellDamage['condition'];
}

interface ResolveContext {
  /** Niveau d'emplacement utilisé (1-9 pour un sort L1+). Ignoré pour cantrip. */
  readonly slotLevel: number;
  /** Niveau total du personnage (1-20). Ignoré pour sort L1+. */
  readonly casterLevel: number;
}

/**
 * Résout une entrée `SpellDamage` contre le contexte de cast. Retourne la
 * formule finale + métadonnées de présentation. **Stateless** — pure function.
 *
 * @param entry Entrée brute issue de `spell.damage[i]` (bundle).
 * @param spell Le sort parent (pour son `level` qui fixe l'offset upcast).
 * @param ctx   Contexte de cast (`slotLevel` + `casterLevel`).
 */
export function resolveSpellDamage(
  entry: SpellDamage,
  spell: Pick<Spell, 'level'>,
  ctx: ResolveContext,
): ResolvedSpellDamage {
  const base = {
    type: entry.type,
    typeLabel: entry.typeLabel,
    resolution: entry.resolution,
    condition: entry.condition,
  };

  // Cas 1 — cantrip : char-level scaling, pas de notion de slot.
  if (spell.level === 0) {
    const scaled = pickCantripFormula(entry, ctx.casterLevel);
    return { ...base, formula: scaled };
  }

  // Cas 2 — sort L1+ : upcast via `atHigherLevels.perLevel`.
  const upcastDelta = ctx.slotLevel - spell.level;
  if (upcastDelta > 0 && entry.atHigherLevels) {
    const formula = appendUpcast(
      entry.formula,
      entry.atHigherLevels.perLevel,
      upcastDelta,
    );
    return { ...base, formula };
  }

  // Cas 3 — slot au niveau de base, ou pas de scaling défini → formule brute.
  return { ...base, formula: entry.formula };
}

/**
 * Sélectionne la formule de cantrip pour un niveau de personnage donné.
 * Tombe sur `entry.formula` (tier 1, L1-4) si pas de `cantripScaling` ou si
 * caster en-dessous du premier seuil.
 */
function pickCantripFormula(entry: SpellDamage, casterLevel: number): string {
  const cs = entry.cantripScaling;
  if (!cs) return entry.formula;
  if (casterLevel >= CANTRIP_TIER_THRESHOLDS.tier17) return cs.tier17;
  if (casterLevel >= CANTRIP_TIER_THRESHOLDS.tier11) return cs.tier11;
  if (casterLevel >= CANTRIP_TIER_THRESHOLDS.tier5) return cs.tier5;
  return entry.formula;
}

/**
 * Concatène la formule de base avec le scaling upcast.
 *
 * Pour `perLevel = '+1d6'` et 2 niveaux au-dessus de base :
 *   base = '8d6', upcastDelta = 2 → '8d6 + 2d6'
 *
 * Le format texte concaténé est volontaire — `parseFormula` (moteur de dés
 * GrimWar) accepte les sommes (« NdX + MdY »). Plus lisible côté UI qu'une
 * recomposition genre « 10d6 » qui camoufle l'origine du scaling.
 */
function appendUpcast(
  baseFormula: string,
  perLevel: string,
  upcastDelta: number,
): string {
  // Format attendu : `+NdX` (signed, single die expr). Si format inattendu,
  // on retourne base sans toucher (la regression deviendrait un test rouge
  // sur Fireball/Lightning Bolt).
  const m = perLevel.match(/^([+-])(\d+)d(\d+)$/);
  if (!m) return baseFormula;
  const sign = m[1]!;
  const count = parseInt(m[2]!, 10) * upcastDelta;
  const die = m[3]!;
  return `${baseFormula} ${sign} ${count}d${die}`;
}
