/**
 * SRD CC v5.2.1 — Objets merveilleux à tables/variantes (3 entrées).
 *
 * Batch D29.19 (backfill EN des magic-items grandfathered AideDD).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *     (Amulet of the Planes l. 20924, Apparatus of the Crab l. 20966, Dragon Orb
 *     l. 21840)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *     (Amulette des plans l. 24405, Orbe draconique l. 27662, Submersible du
 *     Crabe l. 29013 + table des leviers l. 29102)
 *
 * Corrections issues du SRD :
 *   - `attunement` : l'Amulette des plans et l'Orbe draconique étaient `false`
 *     (héritage AideDD) → le SRD 5.2.1 les marque « Requires Attunement »
 *     (simple → `true`). Le Submersible n'en exige AUCUNE → reste `false`.
 *   - `rarity` (DRIFT) : `orbe-des-dragons` était `common` (erreur AideDD) → le
 *     SRD le classe **`artifact`** (« Wondrous Item, Artifact »). Corrigé.
 *   - `name.fr` (DRIFT) : « Orbe des dragons » → **« Orbe draconique »** (Dragon
 *     Orb, l. 27662) ; « Submersible de Kwalish » → **« Submersible du Crabe »**
 *     (Apparatus of the Crab — « Kwalish » abandonné en 2024, l. 29013). Slugs
 *     préservés byte-identique.
 *   - `magicDescription` : reformulé sur la VF officielle SRD ; tables (Amulette
 *     des plans, leviers du Submersible, sorts de l'Orbe) inlinées. L'ordre des
 *     sorts de l'Orbe diffère entre EN et FR (chaque langue reproduit SON ordre).
 *
 * Conventions (identiques aux modules D29.1→D29.18) : hyphénations / sauts de page
 * retirés ; apostrophes FR en ASCII, EN verbatim SRD (quotes courbes) ; `\n\n`
 * entre blocs ; tables inlinées.
 */

import type { SrdMagicItemEntry } from './srd-magic-items-potions';

export const SRD_MAGIC_ITEMS_WONDROUS_VARIANTS: SrdMagicItemEntry[] = [
  {
    id: 'amulette-des-plans',
    name: { fr: 'Amulette des plans', en: 'Amulet of the Planes' },
    category: 'gear',
    rarity: 'very rare',
    attunement: true,
    magicDescription: {
      fr: "Tant que vous portez cette amulette, vous pouvez entreprendre l'action Magie en nommant un lieu que vous connaissez sur un autre plan d'existence. Effectuez ensuite un test d'Intelligence (Arcanes) DD 15. En cas de réussite, vous lancez changement de plan. En cas d'échec, vous-même et chaque créature et objet dans un rayon de 4,50 m voyagez vers une destination aléatoire déterminée par un jet de 1d100 sur la table ci-après.\n\nDestination (1d100) : 01-60, Emplacement aléatoire sur le plan que vous aviez nommé ; 61-70, Emplacement aléatoire sur un Plan Intérieur déterminé par le résultat de 1d6 (1, le Plan de l'Air ; 2, le Plan de la Terre ; 3, le Plan du Feu ; 4, le Plan de l'Eau ; 5, la Féerie ; 6, la Gisombre) ; 71-80, Emplacement aléatoire sur un Plan Extérieur déterminé par le résultat de 1d8 (1, l'Arborée ; 2, l'Arcadie ; 3, les Terres des Bêtes ; 4, la Bytopie ; 5, l'Élysée ; 6, Méchanus ; 7, le Mont Céleste ; 8, Ysgard) ; 81-90, Emplacement aléatoire sur un Plan Extérieur déterminé par le résultat de 1d8 (1, les Abysses ; 2, l'Achéron ; 3, les Carcères ; 4, la Géhenne ; 5, Hadès ; 6, les Limbes ; 7, les Neuf Enfers ; 8, le Pandémonium) ; 91-00, Emplacement aléatoire sur le Plan Astral.",
      en: 'While wearing this amulet, you can take a Magic action to name a location that you are familiar with on another plane of existence. Then make a DC 15 Intelligence (Arcana) check. On a successful check, you cast Plane Shift. On a failed check, you and each creature and object within 15 feet of you travel to a random destination determined by rolling 1d100 and consulting the following table.\n\nDestination (1d100): 01–60, Random location on the plane you named; 61–70, Random location on an Inner Plane determined by rolling 1d6 (on a 1, the Plane of Air; on a 2, the Plane of Earth; on a 3, the Plane of Fire; on a 4, the Plane of Water; on a 5, the Feywild; on a 6, the Shadowfell); 71–80, Random location on an Outer Plane determined by rolling 1d8 (on a 1, Arborea; on a 2, Arcadia; on a 3, the Beastlands; on a 4, Bytopia; on a 5, Elysium; on a 6, Mechanus; on a 7, Mount Celestia; on an 8, Ysgard); 81–90, Random location on an Outer Plane determined by rolling 1d8 (on a 1, the Abyss; on a 2, Acheron; on a 3, Carceri; on a 4, Gehenna; on a 5, Hades; on a 6, Limbo; on a 7, the Nine Hells; on an 8, Pandemonium); 91–00, Random location on the Astral Plane.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // DRIFT nom : « Submersible de Kwalish » → « Submersible du Crabe ».
    id: 'submersible-de-kwalish',
    name: { fr: 'Submersible du Crabe', en: 'Apparatus of the Crab' },
    category: 'gear',
    rarity: 'legendary',
    attunement: false,
    magicDescription: {
      fr: "Cet objet ressemble de prime abord à un baril hermétique en fer d'un poids de 250 kg. Le tonneau est doté d'un loquet caché que l'on trouve à condition de réussir un test d'Intelligence (Investigation) DD 20. Actionner le loquet déverrouille une écoutille sur l'une des faces rondes du baril, ce qui permet à deux créatures de taille M ou inférieure de ramper à l'intérieur. Dix leviers sont disposés en ligne au fond du baril, chacun en position neutre et que l'on peut actionner vers le haut ou le bas. Lorsque certains leviers sont actionnés, l'appareil se transforme pour prendre l'apparence d'un homard géant.\n\nLe submersible du Crabe est un objet de taille G avec le profil suivant : CA 20, 200 pv, Vitesse 9 m, nage 9 m (ou 0 m pour les deux si les pattes ne sont pas déployées) ; Immunité contre les dégâts psychiques et de poison.\n\nPour être utilisé comme véhicule, le submersible nécessite un pilote. Tant que la trappe est fermée, le compartiment est étanche à l'air et à l'eau. Le compartiment contient suffisamment d'air pour 10 heures de ventilation, divisées par le nombre de créatures qui respirent à l'intérieur.\n\nLe submersible flotte sur l'eau. Il peut également être immergé jusqu'à une profondeur de 270 m. Plus profondément, le véhicule, soumis à une trop forte pression, subit chaque minute 2d6 dégâts contondants.\n\nUne créature dans le compartiment peut consacrer l'action Utilisation à activer un ou deux des leviers du submersible vers le haut ou le bas. Après chaque utilisation, un levier revient en position neutre. Chaque levier, de gauche à droite, fonctionne comme indiqué ci-après.\n\nLeviers du submersible (Levier, Haut, Bas) : 1, Les pattes se déploient et le submersible est apte à la marche comme à la nage / Les pattes se rétractent, ce qui réduit la Vitesse et la Vitesse de nage du submersible à 0 m et l'empêche de bénéficier d'un quelconque bonus de vitesse. 2, Le volet du hublot avant s'ouvre / Le volet du hublot avant se ferme. 3, Les volets des hublots latéraux s'ouvrent (deux par côté) / Les volets des hublots latéraux se ferment (deux par côté). 4, Deux pinces se déploient depuis les côtés, à l'avant du submersible / Les pinces se rétractent. 5, Chaque pince déployée effectue l'attaque de corps à corps suivante : +8 pour toucher, allonge 1,50 m, Touché : 7 (2d6) dégâts contondants / Chaque pince déployée effectue l'attaque de corps à corps suivante : +8 pour toucher, allonge 1,50 m, Touché : La cible subit l'état Agrippé (évasion DD 15). 6, Le submersible marche ou nage vers l'avant à condition que ses pattes soient déployées / vers l'arrière. 7, Le submersible pivote de 90 degrés vers la gauche à condition que ses pattes soient déployées / vers la droite. 8, Des yeux mécaniques émettent une Lumière vive dans un rayon de 9 m et une Lumière faible sur 9 m de plus / La lumière s'éteint. 9, Le submersible descend de 6 m s'il évolue dans l'élément liquide / Le submersible remonte de 6 m. 10, L'écoutille arrière s'ouvre / L'écoutille arrière se ferme hermétiquement.",
      en: 'This item first appears to be a sealed iron barrel weighing 500 pounds. The barrel has a hidden catch, which can be found with a successful DC 20 Intelligence (Investigation) check. Releasing the catch unlocks a hatch at one end of the barrel, allowing two Medium or smaller creatures to crawl inside. Ten levers are set in a row at the far end, each in a neutral position, able to move up or down. When certain levers are used, the apparatus transforms to resemble a giant lobster.\n\nThe Apparatus of the Crab is a Large object with the following statistics: AC 20; HP 200; Speed 30 ft., Swim 30 ft. (or 0 ft. for both if the legs aren’t extended); Immunity to Poison and Psychic damage.\n\nTo be used as a vehicle, the apparatus requires one pilot. While the apparatus’s hatch is closed, the compartment is airtight and watertight. The compartment holds enough air for 10 hours of breathing, divided by the number of breathing creatures inside.\n\nThe apparatus floats on water. It can also go underwater to a depth of 900 feet. Below that, the vehicle takes 2d6 Bludgeoning damage each minute from pressure.\n\nA creature in the compartment can take a Utilize action to move as many as two of the apparatus’s levers up or down. After each use, a lever goes back to its neutral position. Each lever, from left to right, functions as shown below.\n\nApparatus of the Crab Levers (Lever, Up, Down): 1, Legs extend, allowing the apparatus to walk and swim / Legs retract, reducing the apparatus’s Speed and Swim Speed to 0 and making it unable to benefit from bonuses to speed. 2, Forward window shutter opens / Forward window shutter closes. 3, Side window shutters open (two per side) / Side window shutters close (two per side). 4, Two claws extend from the front side of the apparatus / The claws retract. 5, Each extended claw makes the following melee attack: +8 to hit, reach 5 ft. Hit: 7 (2d6) Bludgeoning damage / Each extended claw makes the following melee attack: +8 to hit, reach 5 ft. Hit: The target has the Grappled condition (escape DC 15). 6, The apparatus walks or swims forward provided its legs are extended / backward. 7, The apparatus turns 90 degrees counterclockwise provided its legs are extended / clockwise. 8, Eyelike fixtures emit Bright Light in a 30-foot radius and Dim Light for an additional 30 feet / The light turns off. 9, The apparatus sinks up to 20 feet if it’s in liquid / The apparatus rises up to 20 feet if it’s in liquid. 10, The rear hatch unseals and opens / The rear hatch closes and seals.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    // DRIFT nom + rareté : « Orbe des dragons » → « Orbe draconique » ; rareté
    // `common` (erreur AideDD) → `artifact` (SRD « Wondrous Item, Artifact »).
    id: 'orbe-des-dragons',
    name: { fr: 'Orbe draconique', en: 'Dragon Orb' },
    category: 'gear',
    rarity: 'artifact',
    attunement: true,
    magicDescription: {
      fr: "Chaque orbe est un globe de cristal gravé d'environ 25 cm de diamètre. Lorsqu'il est utilisé, il enfle pour atteindre un diamètre d'environ 50 cm, tandis que de la brume tourbillonne à l'intérieur.\n\nUne fois harmonisé avec l'orbe, vous pouvez entreprendre l'action Magie pour scruter ses profondeurs insondables. Effectuez un jet de sauvegarde de Charisme DD 15. En cas de réussite, vous contrôlez l'orbe aussi longtemps que l'harmonisation persiste. Un échec, en revanche, vous place sous l'emprise de l'Artefact en vous imposant l'état Charmé pour toute la durée de l'Harmonisation.\n\nTant que vous êtes Charmé par l'orbe, vous ne pouvez pas volontairement mettre fin à cette Harmonisation et l'orbe lance suggestion sur vous à volonté (sauvegarde DD 18) en vous pressant d'œuvrer à ses desseins maléfiques. Les désirs de l'essence du dragon peuvent prendre bien des formes : anéantir un groupe spécifique, libérer l'orbe, répandre la souffrance dans le monde, faire prospérer le culte de Tiamat ou tout autre sombre dessein imaginé par le MJ.\n\nSorts. L'orbe dispose de 7 charges et récupère quotidiennement 1d4 + 3 charges dépensées, à l'aube. Si vous contrôlez l'orbe, vous pouvez lancer l'un des sorts de la table suivante. La table indique le nombre de charges à dépenser pour lancer le sort.\n\nSort (Coût en charges) : détection de la magie 0 ; lumière du jour 1 ; protection contre la mort 2 ; scrutation (DD de sauvegarde 18) 3 ; soins (au 9e niveau) 4.\n\nAppel des dragons. Tant que vous contrôlez l'orbe, vous pouvez, au prix de l'action Magie, émettre par son biais un appel télépathique qui s'étend dans toutes les directions sur 60 km. Les dragons chromatiques à portée sont contraints de venir vers l'orbe au plus vite et par l'itinéraire le plus direct. Les divinités draconiques, comme Tiamat, ne sont pas affectées par cet appel. Les dragons chromatiques attirés par l'orbe peuvent se montrer Hostiles envers vous pour les avoir contraints à venir. Une fois utilisée, cette propriété ne peut plus resservir pendant 1 heure.\n\nDestruction d'un orbe. Un Orbe draconique est doté d'une CA de 20 et ne peut être détruit que s'il subit des dégâts d'une arme +3 ou du sort désintégration. Nulle autre force ne saurait l'entamer.",
      en: 'An orb is an etched crystal globe about 10 inches in diameter. When used, it grows to about 20 inches in diameter, and mist swirls inside it.\n\nWhile attuned to an orb, you can take a Magic action to peer into the orb’s depths. You must then make a DC 15 Charisma saving throw. On a successful save, you control the orb for as long as you remain attuned to it. On a failed save, the orb imposes the Charmed condition on you for as long as you remain attuned to it.\n\nWhile you are Charmed by the orb, you can’t voluntarily end your Attunement to it, and the orb casts Suggestion on you at will (save DC 18), urging you to work toward the evil ends it desires. The dragon essence within the orb might want many things: the annihilation of a particular society or organization, freedom from the orb, to spread suffering in the world, to advance the worship of Tiamat, or something else the GM decides.\n\nSpells. The orb has 7 charges and regains 1d4 + 3 expended charges daily at dawn. If you control the orb, you can cast one of the spells on the following table from it. The table indicates how many charges you must expend to cast the spell.\n\nSpell (Charge Cost): Cure Wounds (level 9 version) 4; Daylight 1; Death Ward 2; Detect Magic 0; Scrying (save DC 18) 3.\n\nCall Dragons. While you control the orb, you can take a Magic action to cause the orb to issue a telepathic call that extends in all directions for 40 miles. Chromatic dragons in range feel compelled to come to the orb as soon as possible by the most direct route. Dragon deities such as Tiamat are unaffected by this call. Chromatic dragons drawn to the orb might be Hostile toward you for compelling them against their will. Once you have used this property, it can’t be used again for 1 hour.\n\nDestroying an Orb. A Dragon Orb has AC 20 and is destroyed if it takes damage from a +3 Weapon or a Disintegrate spell. Nothing else can harm it.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

/** Compteurs figés (parse strict côté merge script). */
export const SRD_MAGIC_ITEMS_WONDROUS_VARIANTS_COUNTS = {
  total: SRD_MAGIC_ITEMS_WONDROUS_VARIANTS.length,
  veryRare: SRD_MAGIC_ITEMS_WONDROUS_VARIANTS.filter((e) => e.rarity === 'very rare').length,
  legendary: SRD_MAGIC_ITEMS_WONDROUS_VARIANTS.filter((e) => e.rarity === 'legendary').length,
  artifact: SRD_MAGIC_ITEMS_WONDROUS_VARIANTS.filter((e) => e.rarity === 'artifact').length,
  attuned: SRD_MAGIC_ITEMS_WONDROUS_VARIANTS.filter((e) => e.attunement !== false).length,
} as const;
