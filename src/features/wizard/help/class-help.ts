import type { HelpDifficulty } from './help-panel';

/**
 * Contenu pédagogique par classe (plan 05 §D.1 + §D.3).
 *
 * Volontairement en plain string (pas via `t()`) parce que :
 *  1. Le volume justifie un fichier dédié plutôt que de noyer 50+ clés dans i18n.ts.
 *  2. EN sera ajouté en plan 34 par traduction de ce fichier (un seul endroit à toucher).
 *  3. Le contenu sera relu par Adrien avant le commit final du wizard
 *     (STOP gate §D.3.d) — gardez ce fichier ouvert pour la relecture.
 *
 * Source des règles : SRD 5.2.1 (CC-BY-4.0). Ton : débutant total, rassurant,
 * concret. Aucun jargon non expliqué.
 *
 * Règle de rédaction (cf. CLAUDE.md > i18n) : chaque chaîne visible commence
 * par une majuscule, ponctuation correcte, pas d'anglicisme.
 */

export interface ClassHelpEntry {
  /** Slogan court (≤ 60 chars). Affiché sous le nom dans la card. */
  tagline: string;
  /** Paragraphe « À choisir si tu veux… » (1-2 phrases, débutant). */
  whyChoose: string;
  /** 3 bullets concrets de ce que tu fais en jeu. */
  inGame: readonly string[];
  difficulty: HelpDifficulty;
}

export const CLASS_HELP: Record<string, ClassHelpEntry> = {
  barbarian: {
    tagline: 'Le guerrier qui transforme sa rage en force brute',
    whyChoose:
      'Taper fort, encaisser, mener la charge sans jamais lâcher. Tu joues vite et tu te jettes dans la mêlée — la stratégie viendra en grandissant.',
    inGame: [
      'Foncer en première ligne et taper des grosses cibles',
      'Entrer en rage : tu encaisses moins de dégâts et tu en fais plus',
      'Rester debout quand tout le monde est à terre',
    ],
    difficulty: 'easy',
  },
  bard: {
    tagline: 'Le bateleur dont les paroles font et défont la réalité',
    whyChoose:
      'Jouer un personnage social qui parle, séduit, négocie — et qui en plus lance quelques sorts utiles à tout le groupe. Polyvalent par nature.',
    inGame: [
      'Lancer des sorts de soin, de renfort, de contrôle',
      'Inspirer tes alliés avec ton « Inspiration bardique » (un dé bonus offert)',
      'Mener la conversation et faire avancer l’intrigue par le dialogue',
    ],
    difficulty: 'medium',
  },
  cleric: {
    tagline: 'Le porte-parole d’un dieu, soignant et tranchant',
    whyChoose:
      'Soigner ton groupe et le protéger, sans renoncer à frapper toi-même. Tu prépares chaque matin tes sorts dans une énorme liste — beaucoup de polyvalence, mais beaucoup de décisions à anticiper.',
    inGame: [
      'Soigner les blessures, retirer les états (peur, paralysie…)',
      'Lancer des sorts divins offensifs et défensifs',
      'Tenir une ligne avec une armure lourde et un bouclier',
    ],
    difficulty: 'expert',
  },
  druid: {
    tagline: 'L’incarnation vivante du monde sauvage',
    whyChoose:
      'Incarner la nature, te transformer en animal, parler aux bêtes. Tu mélanges soins, contrôle du terrain et formes animales — moins frontal qu’un Clerc, plus polyvalent.',
    inGame: [
      'Te transformer en loup, en ours, en aigle (Forme sauvage)',
      'Invoquer des plantes, des éclairs, du brouillard pour gêner les ennemis',
      'Soigner et affaiblir les ennemis en tirant ta magie de la nature',
    ],
    difficulty: 'expert',
  },
  fighter: {
    tagline: 'Le maître d’armes complet qui frappe sans relâche',
    whyChoose:
      'Le combat pur, sans magie obligatoire, avec énormément d’attaques par tour quand tu montes en niveau. Très accessible : tu tapes, tu encaisses, tu recommences.',
    inGame: [
      'Attaquer deux fois (puis trois, puis quatre) avec ton arme préférée',
      'Utiliser « Second souffle » pour récupérer des PV en plein combat',
      'Tenir n’importe quelle arme et n’importe quelle armure',
    ],
    difficulty: 'easy',
  },
  monk: {
    tagline: 'L’artiste martial qui tisse rapidité et discipline',
    whyChoose:
      'Esquiver, frapper plusieurs fois à mains nues, courir sur les murs. Pas d’armure, pas d’arme lourde — tu comptes sur ta vitesse et ta technique. Plus exigeant à jouer.',
    inGame: [
      'Enchaîner 3 à 4 coups par tour avec tes points de ki',
      'Esquiver presque tout grâce à ta CA basée sur Dex + Sag',
      'Utiliser des techniques (étourdir, ralentir, dévier les projectiles)',
    ],
    difficulty: 'expert',
  },
  paladin: {
    tagline: 'Le champion d’un serment, tonnerre et lumière à la fois',
    whyChoose:
      'Combattre en armure lourde, soigner un peu, et exploser un ennemi en canalisant ta foi en une seule frappe (Châtiment divin). Très fort pour débuter, surtout en première ligne.',
    inGame: [
      'Frapper et dépenser un emplacement de sort pour faire des dégâts massifs',
      'Soigner et purger les états chez tes alliés (Imposition des mains)',
      'Diffuser une aura qui améliore les jets de sauvegarde de tes alliés',
    ],
    difficulty: 'medium',
  },
  ranger: {
    tagline: 'Le pisteur qui survit là où les autres se perdent',
    whyChoose:
      'Jouer un combattant agile, à l’arc ou à deux armes, à l’aise dans la nature, avec quelques sorts pratiques. Un peu plus technique qu’un Guerrier mais très flexible.',
    inGame: [
      'Tirer à l’arc à longue distance ou combattre à deux armes',
      'Pister, suivre des traces, ne pas te perdre dans des terrains hostiles',
      'Lancer quelques sorts utilitaires (marque du chasseur, brouillard…)',
    ],
    difficulty: 'medium',
  },
  rogue: {
    tagline: 'L’ombre qui frappe quand personne ne regarde',
    whyChoose:
      'La discrétion, les pièges, les attaques sournoises pour faire mal d’un coup. Tu n’es pas très solide mais tu touches là où ça compte. Bonus : tu repères et désamorces les pièges.',
    inGame: [
      'Placer une « Attaque sournoise » qui fait beaucoup de dégâts d’un coup',
      'Crocheter une serrure, désamorcer un piège, fouiller silencieusement',
      'Esquiver les explosions et les souffles en évitant la moitié des dégâts',
    ],
    difficulty: 'medium',
  },
  sorcerer: {
    tagline: 'Le mage né avec la magie en lui, brut et instinctif',
    whyChoose:
      'Lancer des sorts puissants avec très peu de choix, mais en les modulant à la volée (rallonger leur portée, les jumeler, les rendre subtils). Magie intuitive plutôt qu’érudite.',
    inGame: [
      'Lancer un sort en jumelant ses effets sur deux cibles',
      'Rendre un sort silencieux ou sans gestes (pratique discret)',
      'Récupérer un emplacement de sort en convertissant tes points de magie',
    ],
    difficulty: 'medium',
  },
  warlock: {
    tagline: 'Le pactisant qui paie son pouvoir à un Patron',
    whyChoose:
      'Jouer un lanceur de sorts atypique, avec peu d’emplacements mais qui se rechargent vite (repos court). Très plaisant à incarner pour le côté narratif — qui t’a donné ton pouvoir, à quel prix ?',
    inGame: [
      'Relancer à volonté « Rayon magique » qui monte en puissance avec ton niveau',
      'Recharger tes sorts à chaque repos court, pas seulement au repos long — tu peux donc en relancer plus souvent dans une journée',
      'Apprendre des « Manifestations occultes » qui changent ton style de jeu',
    ],
    difficulty: 'expert',
  },
  wizard: {
    tagline: 'Le savant qui plie la réalité par l’étude',
    whyChoose:
      'La palette de sorts la plus large du jeu, avec un grimoire que tu enrichis aventure après aventure. Plus fragile que les autres en mêlée — reste derrière et laisse parler la magie.',
    inGame: [
      'Lancer un large éventail de sorts (combat, contrôle, exploration)',
      'Préparer chaque matin la liste de sorts dont tu auras besoin aujourd’hui',
      'Apprendre de nouveaux sorts en recopiant ceux que tu trouves',
    ],
    difficulty: 'expert',
  },
};
