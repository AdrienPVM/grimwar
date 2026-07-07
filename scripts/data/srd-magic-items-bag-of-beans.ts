/**
 * SRD CC v5.2.1 — Sac de haricots magiques (1 entrée, table 1d100).
 *
 * Batch D29.21 (backfill EN des magic-items grandfathered AideDD).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt` (Bag of Beans
 *     l. 21080-21158)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt` (Sac de haricots
 *     magiques l. 28566-28658)
 *
 * Corrections issues du SRD :
 *   - `name.fr` (DRIFT) : « Sac de haricots » → **« Sac de haricots magiques »**
 *     (nom officiel WotC FR l. 28566). Slug préservé.
 *   - `attunement` : sans Harmonisation dans les deux éditions (conforme au
 *     bundle) → reste `false`.
 *   - `magicDescription` : reformulé sur la VF officielle SRD ; table des effets
 *     (12 lignes 1d100) inlinée. La table est identique entre éditions.
 *
 * Conventions (identiques aux modules D29.1→D29.20) : hyphénations / sauts de page
 * retirés ; apostrophes FR en ASCII, EN verbatim SRD (quotes courbes) ; `\n\n`
 * entre blocs ; table inlinée.
 */

import type { SrdMagicItemEntry } from './srd-magic-items-potions';

export const SRD_MAGIC_ITEMS_BAG_OF_BEANS: SrdMagicItemEntry[] = [
  {
    // DRIFT nom : « Sac de haricots » → « Sac de haricots magiques ».
    id: 'sac-de-haricots',
    name: { fr: 'Sac de haricots magiques', en: 'Bag of Beans' },
    category: 'gear',
    rarity: 'rare',
    attunement: false,
    magicDescription: {
      fr: "Ce sac de toile épaisse renferme 3d4 haricots secs quand on le découvre. Il pèse 250 g indépendamment du nombre de haricots qu'il contient et devient un objet non magique dès qu'il est vide.\n\nSi vous lancez un ou plusieurs haricots hors du sac, ils explosent sous forme d'une Sphère de 3 m de rayon centrée sur lui. Tous les haricots ainsi lancés sont détruits dans l'explosion. Chaque créature prise dans la Sphère, y compris vous-même, effectue un jet de sauvegarde de Dextérité DD 15, et subit 5d4 dégâts de force en cas d'échec, la moitié en cas de réussite.\n\nSi vous retirez un haricot du sac, le plantez dans la terre ou le sable puis l'arrosez, il disparaît et produit un effet 1 minute plus tard, à l'endroit où vous l'avez planté. Le MJ peut choisir un effet dans la table ci-après ou laisser le hasard décider.\n\nEffet (1d100) : 01, 5d4 champignons poussent. Si une créature mange un champignon, lancez n'importe quel dé. En cas de résultat impair, la créature doit réussir un jet de sauvegarde de Constitution DD 15 sous peine de subir 5d6 dégâts de poison et l'état Empoisonné pendant 1 heure. En cas de résultat pair, la créature reçoit 5d6 points de vie temporaires qui persistent pendant 1 heure. 02-10, Un geyser jaillit sur 9 m de haut en déversant de l'eau, de la bière, de la mayonnaise, du thé, du vinaigre, du vin ou de l'huile (au choix du MJ) pendant 1d4 minutes. 11-20, Un sylvanien pousse. Lancez n'importe quel dé. En cas de résultat impair, ce sylvanien est Chaotique Mauvais. En cas de résultat pair, il est Chaotique Bon. 21-30, Une statue de pierre à votre effigie, animée, mais immobile, se dresse et profère des menaces verbales à votre encontre. Si vous partez et que d'autres s'en approchent, elle vous décrit comme le plus odieux des scélérats et intime aux nouveaux arrivants de vous pourchasser. Si vous êtes sur le même plan d'existence que la statue, elle sait exactement où vous êtes. La statue devient inanimée au bout de 24 heures. 31-40, Un feu de camp aux flammes vertes s'allume ; il brûle pendant 24 heures (sauf si quelqu'un l'éteint). 41-50, Trois criards poussent. 51-60, 1d4 + 4 crapauds rose vif émergent en rampant. Chaque fois qu'un crapaud est touché, il se transforme en un monstre de taille G ou inférieure au choix du MJ, qui agit selon son alignement et sa nature. Le monstre persiste pendant 1 minute puis disparaît dans une bouffée de fumée rose vif. 61-70, Une bulette affamée surgit du sol et passe à l'attaque. 71-80, Un arbre fruitier émerge. Il porte 1d10 + 20 fruits, dont 1d8 agissent comme autant de potions déterminées aléatoirement. L'arbre disparaît au bout de 1 heure. Les fruits cueillis persistent et conservent leurs propriétés magiques pendant 30 jours. 81-90, Un nid contenant 1d4 + 3 œufs aux couleurs de l'arc-en-ciel apparaît. Toute créature qui mange un œuf effectue un jet de sauvegarde de Constitution DD 20. En cas de réussite, cette créature augmente sa valeur de caractéristique la plus basse de 1, de manière permanente, le hasard décidant de laquelle en cas d'égalité. En cas d'échec, la créature subit 10d6 dégâts de force, provoqués par une explosion interne. 91-95, Une pyramide à base carrée de 18 m de côté surgit du sol. À l'intérieur, une chambre funéraire abrite une momie, une momie auguste ou quelque autre Mort-vivant choisi par le MJ. Son sarcophage contient un trésor choisi par le MJ. 96-00, Un plant de haricot géant surgit, poussant jusqu'à une hauteur décidée par le MJ. Le sommet mène là où le MJ le décide : panorama superbe, château d'une géante des nuages, autre plan d'existence, etc.",
      en: 'This heavy cloth bag contains 3d4 dry beans when found. The bag weighs half a pound regardless of how many beans it contains and becomes a nonmagical item when it no longer contains any beans.\n\nIf you dump one or more beans out of the bag, they explode in a 10-foot-radius Sphere centered on them. All the dumped beans are destroyed in the explosion, and each creature in the Sphere, including you, makes a DC 15 Dexterity saving throw, taking 5d4 Force damage on a failed save or half as much damage on a successful one.\n\nIf you remove a bean from the bag, plant it in dirt or sand, and then water it, the bean disappears as it produces an effect 1 minute later from the ground where it was planted. The GM can choose an effect from the following table or determine it randomly.\n\nEffect (1d100): 01, 5d4 toadstools sprout. If a creature eats a toadstool, roll any die. On an odd roll, the eater must succeed on a DC 15 Constitution saving throw or take 5d6 Poison damage and have the Poisoned condition for 1 hour. On an even roll, the eater gains 5d6 Temporary Hit Points for 1 hour. 02–10, A geyser erupts and spouts water, beer, mayonnaise, tea, vinegar, wine, or oil (GM’s choice) 30 feet into the air for 1d4 minutes. 11–20, A Treant sprouts. Roll any die. On an odd roll, the treant is Chaotic Evil. On an even roll, the treant is Chaotic Good. 21–30, An animate but immobile stone statue in your likeness rises and makes verbal threats against you. If you leave it and others come near, it describes you as the most heinous of villains and directs the newcomers to find and attack you. If you are on the same plane of existence as the statue, it knows where you are. The statue becomes inanimate after 24 hours. 31–40, A campfire with green flames springs forth and burns for 24 hours or until it is extinguished. 41–50, Three Shrieker Fungi sprout. 51–60, 1d4 + 4 bright-pink toads crawl forth. Whenever a toad is touched, it transforms into a Large or smaller monster of the GM’s choice that acts in accordance with its alignment and nature. The monster remains for 1 minute, then disappears in a puff of bright-pink smoke. 61–70, A hungry Bulette burrows up and attacks. 71–80, A fruit tree grows. It has 1d10 + 20 fruit, 1d8 of which act as randomly determined potions. The tree vanishes after 1 hour. Picked fruit remains, retaining any magic for 30 days. 81–90, A nest of 1d4 + 3 rainbow-colored eggs springs up. Any creature that eats an egg makes a DC 20 Constitution saving throw. On a successful save, a creature permanently increases its lowest ability score by 1, randomly choosing among equally low scores. On a failed save, the creature takes 10d6 Force damage from an internal explosion. 91–95, A pyramid with a 60-foot-square base bursts upward. Inside is a burial chamber containing a Mummy, a Mummy Lord, or some other Undead of the GM’s choice. Its sarcophagus contains treasure of the GM’s choice. 96–00, A giant beanstalk sprouts, growing to a height of the GM’s choice. The top leads where the GM chooses, such as to a great view, a cloud giant’s castle, or another plane of existence.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

/** Compteurs figés (parse strict côté merge script). */
export const SRD_MAGIC_ITEMS_BAG_OF_BEANS_COUNTS = {
  total: SRD_MAGIC_ITEMS_BAG_OF_BEANS.length,
  rare: SRD_MAGIC_ITEMS_BAG_OF_BEANS.filter((e) => e.rarity === 'rare').length,
  attuned: SRD_MAGIC_ITEMS_BAG_OF_BEANS.filter((e) => e.attunement !== false).length,
} as const;
