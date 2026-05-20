/**
 * Sorts — table d'alias d'IDs « PHB 2014 (AideDD) » → « SRD 5.2.1 (2024) »
 * + retraits hors-SRD, et la fonction de migration runtime des persos.
 *
 * Pourquoi ici (et non dans `scripts/`) : ces données sont consommées au
 * RUNTIME (migration des `knownSpells[]` / `preparedSpells[]` à la lecture
 * d'une fiche, cf. `use-character.ts`). Le module est donc canonique côté
 * `src/` ; `scripts/maps/spell-renames-2014-to-2024.ts` n'est plus qu'un
 * ré-export pour la réconciliation d'audit (sens scripts → src, déjà établi
 * par `build-public-content.ts` qui importe `src/shared/types`). Source de
 * vérité unique, zéro duplication.
 *
 * Dérivation : diff des IDs (ancien bundle AideDD 330 / nouveau SRD 339),
 * appariement par dé-éponymisation + niveau + école + (cas ambigus) lecture
 * de la description contre le SRD. Chaque ligne a été vérifiée individuellement ;
 * les 3 cas non triviaux (`contrat` = Planar Binding, `terraformage` = Move
 * Earth, `prevoyance` = Contingency) ont été identifiés par leur description FR.
 *
 * Trié par `newId` (déterminisme). Voir `plans/DEBT.md > D16` pour les
 * divergences vis-à-vis de l'estimation D.3 de l'audit (renames 50 vs ~44).
 */
export interface SpellRename {
  /** ID dans l'ancien bundle AideDD (naming PHB 2014). */
  oldId: string;
  /** ID dans le bundle SRD 5.2.1 régénéré (naming 2024). */
  newId: string;
  /** Nom FR sous l'ancien naming (pour la traçabilité de l'audit). */
  oldNameFr: string;
  /** Nom FR officiel SRD 5.2.1 (vérifié contre `FR_SRD_CC_v5.2.1`). */
  newNameFr: string;
}

export const SPELL_RENAMES_2014_TO_2024: readonly SpellRename[] = [
  { oldId: 'esprit-faible', newId: 'alienation', oldNameFr: 'Esprit faible', newNameFr: 'Aliénation' }, // Befuddlement
  { oldId: 'animation-d-objets', newId: 'animation-des-objets', oldNameFr: "Animation d'objets", newNameFr: 'Animation des objets' }, // Animate Objects
  { oldId: 'armure-de-mage', newId: 'armure-du-mage', oldNameFr: 'Armure de mage', newNameFr: 'Armure du mage' }, // Mage Armor
  { oldId: 'aspersion-d-acide', newId: 'aspersion-acide', oldNameFr: "Aspersion d'acide", newNameFr: 'Aspersion acide' }, // Acid Splash
  { oldId: 'aura-magique-de-nystul', newId: 'aura-magique-de-l-arcaniste', oldNameFr: 'Aura magique de Nystul', newNameFr: 'Aura magique de l’arcaniste' }, // Arcanist’s Magic Aura
  { oldId: 'toucher-du-vampire', newId: 'caresse-du-vampire', oldNameFr: 'Toucher du vampire', newNameFr: 'Caresse du vampire' }, // Vampiric Touch
  { oldId: 'chatiment-revelateur', newId: 'chatiment-de-revelation', oldNameFr: 'Châtiment révélateur', newNameFr: 'Châtiment de révélation' }, // Shining Smite
  { oldId: 'chien-de-garde-de-mordenkainen', newId: 'chien-de-garde', oldNameFr: 'Chien de garde de Mordenkainen', newNameFr: 'Chien de garde' }, // Faithful Hound
  { oldId: 'coffre-secret-de-leomund', newId: 'coffre-secret', oldNameFr: 'Coffre secret de Léomund', newNameFr: 'Coffre secret' }, // Secret Chest
  { oldId: 'contact-avec-un-autre-plan', newId: 'contact-avec-les-plans', oldNameFr: 'Contact avec un autre plan', newNameFr: 'Contact avec les plans' }, // Contact Other Plane
  { oldId: 'convocations-instantanees-de-drawmij', newId: 'convocations-instantanees', oldNameFr: 'Convocations instantanées de Drawmij', newNameFr: 'Convocations instantanées' }, // Instant Summons
  { oldId: 'gourdin-magique', newId: 'crosse-des-druides', oldNameFr: 'Gourdin magique', newNameFr: 'Crosse des druides' }, // Shillelagh
  { oldId: 'danse-irresistible-d-otto', newId: 'danse-irresistible', oldNameFr: "Danse irrésistible d'Otto", newNameFr: 'Danse irrésistible' }, // Irresistible Dance
  { oldId: 'voir-l-invisible', newId: 'detection-de-l-invisibilite', oldNameFr: "Voir l'invisible", newNameFr: 'Détection de l’invisibilité' }, // See Invisibility
  { oldId: 'sens-des-pieges', newId: 'detection-des-pieges', oldNameFr: 'Sens des pièges', newNameFr: 'Détection des pièges' }, // Find Traps
  { oldId: 'disque-flottant-de-tenser', newId: 'disque-flottant', oldNameFr: 'Disque flottant de Tenser', newNameFr: 'Disque flottant' }, // Floating Disk
  { oldId: 'dissimulation', newId: 'dissimulation-supreme', oldNameFr: 'Dissimulation', newNameFr: 'Dissimulation suprême' }, // Sequester
  { oldId: 'preservation-des-morts', newId: 'doux-repos', oldNameFr: 'Préservation des morts', newNameFr: 'Doux repos' }, // Gentle Repose
  { oldId: 'rayons-prismatiques', newId: 'embruns-prismatiques', oldNameFr: 'Rayons prismatiques', newNameFr: 'Embruns prismatiques' }, // Prismatic Spray
  { oldId: 'contrat', newId: 'entrave-planaire', oldNameFr: 'Contrat', newNameFr: 'Entrave planaire' }, // Planar Binding (identifié par description)
  { oldId: 'epee-de-mordenkainen', newId: 'epee-arcanique', oldNameFr: 'Épée de Mordenkainen', newNameFr: 'Épée arcanique' }, // Arcane Sword
  { oldId: 'fleche-acide-de-melf', newId: 'fleche-acide', oldNameFr: 'Flèche acide de Melf', newNameFr: 'Flèche acide' }, // Acid Arrow
  { oldId: 'fou-rire-de-tasha', newId: 'fou-rire', oldNameFr: 'Fou rire de Tasha', newNameFr: 'Fou rire' }, // Hideous Laughter
  { oldId: 'terraformage', newId: 'glissement-de-terrain', oldNameFr: 'Terraformage', newNameFr: 'Glissement de terrain' }, // Move Earth (identifié par description)
  { oldId: 'glyphe-de-protection', newId: 'glyphe-de-garde', oldNameFr: 'Glyphe de protection', newNameFr: 'Glyphe de garde' }, // Glyph of Warding
  { oldId: 'oeil-magique', newId: 'il-du-mage', oldNameFr: 'Oeil magique', newNameFr: 'Œil du mage' }, // Arcane Eye
  { oldId: 'projection-d-image', newId: 'image-projetee', oldNameFr: "Projection d'image", newNameFr: 'Image projetée' }, // Project Image
  { oldId: 'fleau', newId: 'imprecation', oldNameFr: 'Fléau', newNameFr: 'Imprécation' }, // Bane (≠ Hex = « Maléfice », déjà présent)
  { oldId: 'invisibilite-superieure', newId: 'invisibilite-supreme', oldNameFr: 'Invisibilité supérieure', newNameFr: 'Invisibilité suprême' }, // Greater Invisibility
  { oldId: 'lien-telepathique-de-rary', newId: 'lien-telepathique', oldNameFr: 'Lien télépathique de Rary', newNameFr: 'Lien télépathique' }, // Telepathic Bond
  { oldId: 'main-de-bigby', newId: 'main-arcanique', oldNameFr: 'Main de Bigby', newNameFr: 'Main arcanique' }, // Arcane Hand
  { oldId: 'main-de-mage', newId: 'main-du-mage', oldNameFr: 'Main de mage', newNameFr: 'Main du mage' }, // Mage Hand
  { oldId: 'manoir-somptueux-de-mordenkainen', newId: 'manoir-somptueux', oldNameFr: 'Manoir somptueux de Mordenkainen', newNameFr: 'Manoir somptueux' }, // Magnificent Mansion
  { oldId: 'marche-sur-l-eau', newId: 'marche-sur-l-onde', oldNameFr: "Marche sur l'eau", newNameFr: 'Marche sur l’onde' }, // Water Walk
  { oldId: 'mauvais-oeil', newId: 'mauvais-il', oldNameFr: 'Mauvais oeil', newNameFr: 'Mauvais œil' }, // Eyebite
  { oldId: 'formes-animales', newId: 'metamorphose-animale', oldNameFr: 'Formes animales', newNameFr: 'Métamorphose animale' }, // Animal Shapes
  { oldId: 'sens-de-l-orientation', newId: 'orientation', oldNameFr: "Sens de l'orientation", newNameFr: 'Orientation' }, // Find the Path
  { oldId: 'petite-hutte-de-leomund', newId: 'petite-hutte', oldNameFr: 'Petite hutte de Léomund', newNameFr: 'Petite hutte' }, // Tiny Hut
  { oldId: 'urne-magique', newId: 'possession', oldNameFr: 'Urne magique', newNameFr: 'Possession' }, // Magic Jar
  { oldId: 'prevoyance', newId: 'premeditation', oldNameFr: 'Prévoyance', newNameFr: 'Préméditation' }, // Contingency (identifié par description ; l'ancienne école AideDD « evocation » était erronée)
  { oldId: 'protection-contre-une-energie', newId: 'protection-contre-l-energie', oldNameFr: 'Protection contre une énergie', newNameFr: 'Protection contre l’énergie' }, // Protection from Energy
  { oldId: 'purification-de-nourriture-et-d-eau', newId: 'purification-de-la-nourriture-et-de-l-eau', oldNameFr: "Purification de nourriture et d'eau", newNameFr: 'Purification de la nourriture et de l’eau' }, // Purify Food and Drink
  { oldId: 'eclair-tracant', newId: 'rayon-tracant', oldNameFr: 'Éclair traçant', newNameFr: 'Rayon traçant' }, // Guiding Bolt
  { oldId: 'restauration-superieure', newId: 'restauration-supreme', oldNameFr: 'Restauration supérieure', newNameFr: 'Restauration suprême' }, // Greater Restoration
  { oldId: 'sanctuaire-prive-de-mordenkainen', newId: 'sanctuaire-prive', oldNameFr: 'Sanctuaire privé de Mordenkainen', newNameFr: 'Sanctuaire privé' }, // Private Sanctum
  { oldId: 'sphere-glaciale-d-otiluke', newId: 'sphere-glacee', oldNameFr: "Sphère glaciale d'Otiluke", newNameFr: 'Sphère glacée' }, // Freezing Sphere
  { oldId: 'sphere-resiliente-d-otiluke', newId: 'sphere-resiliente', oldNameFr: "Sphère résiliente d'Otiluke", newNameFr: 'Sphère résiliente' }, // Resilient Sphere
  { oldId: 'tentacules-noirs-d-evard', newId: 'tentacules-noirs', oldNameFr: "Tentacules noirs d'Evard", newNameFr: 'Tentacules noirs' }, // Black Tentacles
  { oldId: 'peur', newId: 'terreur', oldNameFr: 'Peur', newNameFr: 'Terreur' }, // Fear
  { oldId: 'marche-sur-le-vent', newId: 'vent-divin', oldNameFr: 'Marche sur le vent', newNameFr: 'Vent divin' }, // Wind Walk (≠ Divine Word = « Parole divine », déjà présent)
] as const;

/**
 * 7 sorts de l'ancien bundle AideDD réellement HORS SRD 5.2.1 (retirés). Chaque EN
 * a été vérifié absent de `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`.
 * Conservés ici pour que la migration des persos les signale (`removed`) plutôt
 * que de les remapper silencieusement.
 */
export const SPELL_REMOVALS_NON_SRD: readonly { oldId: string; oldNameFr: string; en: string }[] = [
  { oldId: 'amis', oldNameFr: 'Amis', en: 'Friends' },
  { oldId: 'armure-d-agathys', oldNameFr: "Armure d'Agathys", en: 'Armor of Agathys' },
  { oldId: 'fouet-epineux', oldNameFr: 'Fouet épineux', en: 'Thorn Whip' },
  { oldId: 'nuee-de-dagues', oldNameFr: 'Nuée de dagues', en: 'Cloud of Daggers' },
  { oldId: 'protection-contre-les-armes', oldNameFr: 'Protection contre les armes', en: 'Blade Ward' },
  { oldId: 'sens-animal', oldNameFr: 'Sens animal', en: 'Beast Sense' },
  { oldId: 'trait-ensorcele', oldNameFr: 'Trait ensorcelé', en: 'Witch Bolt' },
] as const;

const RENAME_BY_OLD_ID: ReadonlyMap<string, string> = new Map(
  SPELL_RENAMES_2014_TO_2024.map((r) => [r.oldId, r.newId]),
);

const REMOVED_OLD_IDS: ReadonlySet<string> = new Set(
  SPELL_REMOVALS_NON_SRD.map((r) => r.oldId),
);

export interface SpellMigrationResult {
  /**
   * Liste finale des IDs après application des renames, retraits exclus,
   * doublons dé-dupliqués (un rename peut collisionner avec un ID déjà 2024).
   * L'ordre relatif des IDs conservés est préservé.
   */
  migrated: string[];
  /** IDs hors-SRD retirés (à signaler au MJ, jamais remappés silencieusement). */
  removed: string[];
  /** `true` si `migrated` diffère de l'entrée OU si des IDs ont été retirés. */
  changed: boolean;
}

/**
 * Migre une liste d'IDs de sort « 2014 (AideDD) » vers « SRD 5.2.1 (2024) ».
 *
 * - ID renommé → remplacé par son ID SRD 2024.
 * - ID retiré du SRD → exclu de `migrated`, listé dans `removed`.
 * - ID déjà 2024 (ou inconnu des tables) → conservé tel quel.
 *
 * Idempotente : appliquer deux fois donne le même résultat (les IDs déjà
 * migrés ne sont plus dans `RENAME_BY_OLD_ID`).
 */
export function migrateSpellIds(ids: readonly string[]): SpellMigrationResult {
  const migrated: string[] = [];
  const removed: string[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    if (REMOVED_OLD_IDS.has(id)) {
      removed.push(id);
      continue;
    }
    const next = RENAME_BY_OLD_ID.get(id) ?? id;
    if (seen.has(next)) continue; // dé-dup : rename collisionnant avec un ID déjà présent
    seen.add(next);
    migrated.push(next);
  }

  const changed =
    removed.length > 0 ||
    migrated.length !== ids.length ||
    migrated.some((id, i) => id !== ids[i]);

  return { migrated, removed, changed };
}

/**
 * Migre tous les `Record<classId, string[]>` d'une fiche (knownSpells ou
 * preparedSpells). Retourne le record migré + l'agrégat des IDs retirés (avec
 * leur classe) + un flag `changed` global.
 */
export function migrateSpellRecord(
  record: Readonly<Record<string, string[]>>,
): {
  record: Record<string, string[]>;
  removed: Array<{ classId: string; spellId: string }>;
  changed: boolean;
} {
  const out: Record<string, string[]> = {};
  const removed: Array<{ classId: string; spellId: string }> = [];
  let changed = false;

  for (const [classId, ids] of Object.entries(record)) {
    const result = migrateSpellIds(ids);
    out[classId] = result.migrated;
    if (result.changed) changed = true;
    for (const spellId of result.removed) removed.push({ classId, spellId });
  }

  return { record: out, removed, changed };
}
