import type { CampaignVariants } from '../../types/campaign';
import type { Character } from '../../types/character';
import type { ClassResourcePool } from './class-resources';

/**
 * JALON « repos long » — application PURE du repos long (SRD 5e), variant-aware.
 *
 * Effets standard d'un repos long :
 *   - PV → maximum ;
 *   - dés de vie → on regagne la MOITIÉ du total (arrondi bas, minimum 1),
 *     répartis sur les pools (on remplit chaque pool jusqu'à son max) ;
 *   - réserves de classe → toutes réinitialisées au max (un repos long restaure
 *     ce qu'un repos court restaure, plus les réserves long-rest) ;
 *   - emplacements de sort → tous au max ;
 *   - épuisement → −1 niveau (règle 2024).
 *
 * Variantes (cf. docs/VARIANTS.md, DMG) :
 *   - `slowHealing` (Guérison naturelle lente) : le repos long NE rend PAS les
 *     PV automatiquement — le joueur dépense des dés de vie à la place. On
 *     regagne quand même les dés de vie et on réinitialise les réserves. Donc
 *     HP inchangés, le reste identique.
 *   - `grittyRealism` (Réalisme rugueux) : ne change QUE la DURÉE narrative
 *     (repos court = 8 h, repos long = 7 jours), pas les effets mécaniques. On
 *     ne touche donc à rien ici — l'UI affiche l'avertissement de durée.
 *
 * Fonction PURE : pas d'I/O, pas de Math.random. L'appelant applique le patch
 * via `updateCharacter` (diff auto → events). Les réserves sont passées en
 * paramètre (dérivées par `deriveClassResourcePools`) pour ne pas re-coupler ce
 * module au contenu.
 */

export interface LongRestResult {
  /** Patch à appliquer via `updateCharacter`. */
  patch: Partial<
    Pick<
      Character,
      | 'hp'
      | 'hitDice'
      | 'classResources'
      | 'spellSlots'
      | 'exhaustion'
      | 'featureUsage'
    >
  >;
  /** Résumé pour le toast / journal. */
  summary: {
    /** PV rendus (0 si slowHealing ou déjà au max). */
    hpHealed: number;
    /** Dés de vie regagnés au total. */
    hitDiceRegained: number;
    /** Niveaux d'épuisement retirés (0 ou 1). */
    exhaustionRemoved: number;
    /** Réserves de classe réinitialisées. */
    resourcesReset: number;
  };
}

/** Total courant et max des dés de vie, tous pools confondus. */
function hitDiceTotals(character: Character): { current: number; max: number } {
  return character.hitDice.reduce(
    (acc, p) => ({ current: acc.current + p.current, max: acc.max + p.max }),
    { current: 0, max: 0 },
  );
}

/**
 * Regagne `regain` dés de vie en remplissant les pools dans l'ordre, chacun
 * jusqu'à son max. Retourne le nouveau tableau de pools + le total réellement
 * regagné (capé par la marge disponible).
 */
function regainHitDice(
  hitDice: Character['hitDice'],
  regain: number,
): { hitDice: Character['hitDice']; regained: number } {
  let remaining = regain;
  let regained = 0;
  const next = hitDice.map((pool) => {
    if (remaining <= 0) return pool;
    const room = pool.max - pool.current;
    const add = Math.min(room, remaining);
    remaining -= add;
    regained += add;
    return add > 0 ? { ...pool, current: pool.current + add } : pool;
  });
  return { hitDice: next, regained };
}

/** Variantes par défaut (hors campagne) : aucune variante active. */
export const NO_VARIANTS: CampaignVariants = {
  featAtLevel1: false,
  flanking: false,
  slowHealing: false,
  grittyRealism: false,
};

/**
 * Applique un repos long. `pools` = réserves consommables dérivées du contenu
 * (`deriveClassResourcePools`) — toutes réinitialisées à leur max.
 */
export function applyLongRest(
  character: Character,
  pools: readonly ClassResourcePool[],
  variants: CampaignVariants = NO_VARIANTS,
): LongRestResult {
  // ── PV : max, sauf slowHealing (le joueur dépense ses dés de vie) ─────────
  const hpHealed = variants.slowHealing
    ? 0
    : Math.max(0, character.hp.max - character.hp.current);
  const hp = variants.slowHealing
    ? character.hp
    : { ...character.hp, current: character.hp.max };

  // ── Dés de vie : on regagne la moitié du total (arrondi bas, min 1) ───────
  const totals = hitDiceTotals(character);
  const regainTarget = Math.max(1, Math.floor(totals.max / 2));
  const { hitDice, regained } = regainHitDice(character.hitDice, regainTarget);

  // ── Réserves de classe : toutes au max ───────────────────────────────────
  const classResources: Character['classResources'] = { ...character.classResources };
  for (const pool of pools) {
    classResources[pool.storageKey] = {
      current: pool.max,
      max: pool.max,
      restoresOn: pool.restoresOn,
    };
  }

  // ── Emplacements de sort : tous au max ────────────────────────────────────
  const spellSlots: Character['spellSlots'] = {};
  for (const [key, slot] of Object.entries(character.spellSlots)) {
    spellSlots[key] = { ...slot, current: slot.max };
  }

  // ── Épuisement : −1 niveau (règle 2024) ──────────────────────────────────
  const exhaustionRemoved = character.exhaustion > 0 ? 1 : 0;
  const exhaustion = character.exhaustion - exhaustionRemoved;

  // ── Usages de capacités (featureUsage) : tous au max ─────────────────────
  // Un repos long restaure tout ce qu'un repos court restaure, plus les usages
  // « par repos long » — donc on réinitialise CHAQUE compteur, quelle que soit
  // sa période. Couvre les sorts d'ascendance à recharge (D12b : Tieffelin /
  // Elfe L3-L5, Gnome des forêts). No-op si le record est vide.
  const featureUsage: Character['featureUsage'] = {};
  for (const [key, usage] of Object.entries(character.featureUsage)) {
    featureUsage[key] = { ...usage, current: usage.max };
  }

  return {
    patch: { hp, hitDice, classResources, spellSlots, exhaustion, featureUsage },
    summary: {
      hpHealed,
      hitDiceRegained: regained,
      exhaustionRemoved,
      resourcesReset: pools.length,
    },
  };
}
