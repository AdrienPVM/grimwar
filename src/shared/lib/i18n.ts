import { useLocaleStore, type Locale } from './slices/locale-slice';

/**
 * Scaffold i18n minimal. Le STRINGS map est volontairement court : il grandit
 * plan par plan au fur et à mesure que de nouveaux strings UI apparaissent.
 *
 * Règle : aucun texte UI hardcodé dans les composants — passer par t(key).
 */
export type StringKey =
  | 'splash.brand'
  | 'splash.loading'
  | 'auth.placeholder.email'
  | 'auth.placeholder.password'
  // Schools (sorts)
  | 'school.abjuration'
  | 'school.conjuration'
  | 'school.divination'
  | 'school.enchantment'
  | 'school.evocation'
  | 'school.illusion'
  | 'school.necromancy'
  | 'school.transmutation'
  // Capacités (abilities)
  | 'ability.for'
  | 'ability.dex'
  | 'ability.con'
  | 'ability.int'
  | 'ability.sag'
  | 'ability.cha'
  // Rareté magique
  | 'rarity.common'
  | 'rarity.uncommon'
  | 'rarity.rare'
  | 'rarity.very rare'
  | 'rarity.legendary'
  | 'rarity.artifact'
  // Catégories d'items
  | 'item.category.weapon'
  | 'item.category.armor'
  | 'item.category.shield'
  | 'item.category.gear'
  | 'item.category.tool'
  | 'item.category.pack'
  | 'item.category.mount'
  | 'item.category.vehicle'
  // Wizard (plan 05)
  | 'wizard.title'
  | 'wizard.subtitle'
  | 'wizard.step.identity.title'
  | 'wizard.step.class.title'
  | 'wizard.step.ancestry.title'
  | 'wizard.step.abilities.title'
  | 'wizard.step.background.title'
  | 'wizard.step.skills.title'
  | 'wizard.step.equipment.title'
  | 'wizard.step.spells.title'
  | 'wizard.step.recap.title'
  | 'wizard.field.name'
  | 'wizard.field.level'
  | 'wizard.field.alignment'
  | 'wizard.field.subancestry'
  | 'wizard.field.method'
  | 'wizard.field.trait'
  | 'wizard.field.ideal'
  | 'wizard.field.bond'
  | 'wizard.field.flaw'
  | 'wizard.method.standard-array'
  | 'wizard.method.point-buy'
  | 'wizard.method.manual'
  | 'wizard.label.pointsRemaining'
  | 'wizard.label.cantrips'
  | 'wizard.label.level1Spells'
  | 'wizard.label.option'
  | 'wizard.label.cost'
  | 'wizard.placeholder.name'
  | 'wizard.placeholder.choose'
  | 'wizard.button.create'
  | 'wizard.button.creating'
  | 'wizard.nav.previous'
  | 'wizard.nav.next'
  | 'wizard.nav.invalidStep'
  | 'wizard.progress.aria'
  | 'wizard.toc.aria'
  | 'wizard.progress.label'
  | 'wizard.aria.decrement'
  | 'wizard.aria.increment'
  | 'wizard.action.autofill'
  // Step-specific intros + helpers
  | 'wizard.help.identity.intro'
  | 'wizard.help.identity.levelHelper'
  | 'wizard.help.identity.alignmentHelper'
  | 'wizard.help.class.intro'
  | 'wizard.help.ancestry.intro'
  | 'wizard.help.abilities.intro'
  | 'wizard.help.abilities.method.standard-array'
  | 'wizard.help.abilities.method.point-buy'
  | 'wizard.help.abilities.method.manual'
  | 'wizard.help.abilities.recommended'
  | 'wizard.help.background.intro'
  | 'wizard.help.background.personalityIntro'
  | 'wizard.help.skills.intro'
  | 'wizard.help.equipment.intro'
  | 'wizard.help.spells.intro'
  | 'wizard.help.recap.intro'
  | 'wizard.helpPanel.hint'
  // Lists & UI
  | 'wizard.class.list.aria'
  | 'wizard.class.primary'
  | 'wizard.class.multiclass.title'
  | 'wizard.class.multiclass.intro'
  | 'wizard.class.multiclass.add'
  | 'wizard.class.multiclass.cancel'
  | 'wizard.class.multiclass.pick'
  | 'wizard.class.multiclass.sumMismatch'
  | 'wizard.class.remove.aria'
  | 'wizard.ancestry.list.aria'
  | 'wizard.background.list.aria'
  | 'wizard.background.personality'
  | 'wizard.skills.toPick'
  | 'wizard.skills.fromBackground'
  | 'wizard.skills.fromAncestry'
  | 'wizard.skills.fromClassExpertise'
  | 'wizard.skills.notAllowed'
  | 'wizard.equipment.fromClass'
  | 'wizard.equipment.fromBackground'
  | 'wizard.equipment.noItems'
  | 'wizard.spells.noCaster'
  | 'wizard.spells.preparedDaily'
  | 'wizard.spells.helpHint'
  | 'wizard.spells.bundleEmpty'
  // Sous-choix d'ascendance (plan 13.8)
  | 'wizard.subchoice.section.title'
  | 'wizard.subchoice.section.helper'
  | 'wizard.subchoice.dragonAncestry.legend'
  | 'wizard.subchoice.dragonAncestry.helper'
  | 'wizard.subchoice.dragonAncestry.impactPrefix'
  | 'wizard.subchoice.tieflingLegacy.legend'
  | 'wizard.subchoice.tieflingLegacy.helper'
  | 'wizard.subchoice.tieflingLegacy.resistancePrefix'
  | 'wizard.subchoice.elfLineage.legend'
  | 'wizard.subchoice.elfLineage.helper'
  | 'wizard.subchoice.gnomeLineage.legend'
  | 'wizard.subchoice.gnomeLineage.helper'
  | 'wizard.subchoice.goliathAncestry.legend'
  | 'wizard.subchoice.goliathAncestry.helper'
  | 'wizard.subchoice.ancestryCastingAbility.legend'
  | 'wizard.subchoice.ancestryCastingAbility.helper'
  | 'wizard.subchoice.ancestryCastingAbility.int.description'
  | 'wizard.subchoice.ancestryCastingAbility.sag.description'
  | 'wizard.subchoice.ancestryCastingAbility.cha.description'
  | 'wizard.subchoice.ancestryExtraSkill.legend'
  | 'wizard.subchoice.ancestryExtraSkill.elfHelper'
  | 'wizard.subchoice.ancestryExtraSkill.humanHelper'
  | 'wizard.subchoice.ancestrySize.legend'
  | 'wizard.subchoice.ancestrySize.helper'
  | 'wizard.subchoice.ancestrySize.small.title'
  | 'wizard.subchoice.ancestrySize.small.impact'
  | 'wizard.subchoice.ancestrySize.medium.title'
  | 'wizard.subchoice.ancestrySize.medium.impact'
  | 'wizard.subchoice.unmet.aria'
  // Bannière de garde "données manquantes" sur chooser de sous-choix (plan 13.8
  // UAT 2026-05-17). Apparaît quand la liste d'options à afficher est vide alors
  // que l'ascendance courante exige ce sous-choix par SRD — durcissement A
  // équivalent à la bannière "wizard.spells.bundleEmpty".
  | 'wizard.subchoice.missingData.title'
  | 'wizard.subchoice.missingData.body'
  // Mobile : déclencheur explicite « ? » + label de fermeture modale
  | 'wizard.helpPanel.viewDetail'
  | 'wizard.helpPanel.close'
  // Spell detail panel (étape Sorts du wizard — réutilisé partout où on rend un sort)
  | 'spell.level.cantrip'
  | 'spell.level.prefix'
  | 'spell.meta.castingTime'
  | 'spell.meta.range'
  | 'spell.meta.duration'
  | 'spell.meta.components'
  | 'spell.meta.atHigherLevels'
  | 'spell.flag.concentration'
  | 'spell.flag.ritual'
  // Composantes développées + gloses pour novices (UAT post-plan 05)
  | 'spell.component.verbal.label'
  | 'spell.component.verbal.hint'
  | 'spell.component.somatic.label'
  | 'spell.component.somatic.hint'
  | 'spell.component.material.label'
  | 'spell.component.material.hint'
  | 'spell.gloss.concentration'
  | 'spell.gloss.ritual'
  // Recap
  | 'wizard.recap.identity'
  | 'wizard.recap.class'
  | 'wizard.recap.classSingular'
  | 'wizard.recap.classMulti'
  | 'wizard.recap.ancestry'
  | 'wizard.recap.ancestryYou'
  | 'wizard.recap.speed'
  | 'wizard.recap.abilities'
  | 'wizard.recap.abilitiesIntro'
  | 'wizard.recap.background'
  | 'wizard.recap.backgroundIntro'
  | 'wizard.recap.skills'
  | 'wizard.recap.skillsIntro'
  | 'wizard.recap.skillsNone'
  | 'wizard.recap.equipment'
  | 'wizard.recap.equipmentIntro'
  | 'wizard.recap.combat'
  | 'wizard.recap.combatHp'
  | 'wizard.recap.hpExplanation'
  | 'wizard.recap.combatAc'
  | 'wizard.recap.acExplanation'
  | 'wizard.recap.combatProf'
  | 'wizard.recap.profExplanation'
  | 'wizard.recap.level'
  | 'wizard.recap.edit'
  | 'wizard.recap.editAria'
  // Errors + toasts
  | 'wizard.error.nameRequired'
  | 'wizard.error.authNotReady'
  | 'wizard.error.incompleteDraft'
  | 'wizard.toast.created.title'
  // Sheet
  | 'sheet.notFound'
  | 'sheet.notFound.hint'
  | 'sheet.backHome'
  | 'sheet.error.title'
  | 'sheet.statusStrip.aria'
  | 'sheet.modeTabs.aria'
  | 'sheet.stat.hp'
  | 'sheet.stat.ac'
  | 'sheet.stat.init'
  | 'sheet.stat.speed'
  | 'sheet.mode.combat'
  | 'sheet.mode.essence'
  | 'sheet.mode.magie'
  | 'sheet.mode.avoir'
  | 'sheet.mode.ame'
  | 'sheet.placeholder.todo'
  // Sorts d'ascendance — plan 13.8
  | 'sheet.magie.ancestry.tieflingTitle'
  | 'sheet.magie.ancestry.elfTitle'
  | 'sheet.magie.ancestry.gnomeTitle'
  | 'sheet.magie.ancestry.genericTitle'
  // Nav shell (header sticky persistant — plan 13.6)
  | 'nav.aria'
  | 'nav.brand.aria'
  | 'nav.back'
  | 'nav.back.aria'
  | 'nav.avatar.aria'
  // Library (point d'entrée S1 — plan 13.6)
  | 'library.title'
  | 'library.subtitle'
  | 'library.cta.create'
  | 'library.empty.title'
  | 'library.empty.body'
  | 'library.error.title'
  | 'library.error.body'
  | 'library.error.retry'
  | 'library.list.aria'
  | 'library.card.open'
  | 'library.card.level'
  | 'library.card.aliveLabel'
  | 'library.card.deadLabel'
  // Avoir — form custom item (placeholder neutralisé — plan 13.6 cleanup)
  | 'avoir.customItem.placeholder';

type Dict = Record<StringKey, string>;

const STRINGS: Record<Locale, Dict> = {
  fr: {
    'splash.brand': 'GrimWar',
    'splash.loading': 'Invocation en cours…',
    'auth.placeholder.email': 'Adresse e-mail',
    'auth.placeholder.password': 'Mot de passe',
    // Schools
    'school.abjuration': 'Abjuration',
    'school.conjuration': 'Invocation',
    'school.divination': 'Divination',
    'school.enchantment': 'Enchantement',
    'school.evocation': 'Évocation',
    'school.illusion': 'Illusion',
    'school.necromancy': 'Nécromancie',
    'school.transmutation': 'Transmutation',
    // Abilities
    'ability.for': 'Force',
    'ability.dex': 'Dextérité',
    'ability.con': 'Constitution',
    'ability.int': 'Intelligence',
    'ability.sag': 'Sagesse',
    'ability.cha': 'Charisme',
    // Rarities
    'rarity.common': 'Commun',
    'rarity.uncommon': 'Peu commun',
    'rarity.rare': 'Rare',
    'rarity.very rare': 'Très rare',
    'rarity.legendary': 'Légendaire',
    'rarity.artifact': 'Artefact',
    // Item categories
    'item.category.weapon': 'Arme',
    'item.category.armor': 'Armure',
    'item.category.shield': 'Bouclier',
    'item.category.gear': 'Équipement',
    'item.category.tool': 'Outil',
    'item.category.pack': 'Sac',
    'item.category.mount': 'Monture',
    'item.category.vehicle': 'Véhicule',
    // Wizard (plan 05)
    'wizard.title': 'Créer un personnage',
    'wizard.subtitle':
      "On t'accompagne pas à pas. Choisis ce qui te parle, on s'occupe des règles.",
    'wizard.step.identity.title': 'Identité',
    'wizard.step.class.title': 'Classe',
    'wizard.step.ancestry.title': 'Ascendance',
    'wizard.step.abilities.title': 'Caractéristiques',
    'wizard.step.background.title': 'Historique',
    'wizard.step.skills.title': 'Compétences',
    'wizard.step.equipment.title': 'Équipement',
    'wizard.step.spells.title': 'Sorts',
    'wizard.step.recap.title': 'Récapitulatif',
    'wizard.field.name': 'Nom',
    'wizard.field.level': 'Niveau',
    'wizard.field.alignment': 'Alignement',
    'wizard.field.subancestry': 'Sous-ascendance',
    'wizard.field.method': 'Méthode',
    'wizard.field.trait': 'Trait de personnalité',
    'wizard.field.ideal': 'Idéal',
    'wizard.field.bond': 'Attache',
    'wizard.field.flaw': 'Défaut',
    'wizard.method.standard-array': 'Tableau standard',
    'wizard.method.point-buy': 'Achat de points',
    'wizard.method.manual': 'Manuel',
    'wizard.label.pointsRemaining': 'Points restants',
    'wizard.label.cantrips': 'Sorts mineurs (cantrips)',
    'wizard.label.level1Spells': 'Sorts de niveau 1',
    'wizard.label.option': 'Option',
    'wizard.label.cost': 'Coût',
    'wizard.placeholder.name': "Nom de l'aventurier",
    'wizard.placeholder.choose': 'Choisir…',
    'wizard.button.create': 'Créer le personnage',
    'wizard.button.creating': 'Création en cours…',
    'wizard.nav.previous': 'Précédent',
    'wizard.nav.next': 'Suivant',
    'wizard.nav.invalidStep': 'Termine cette étape pour continuer.',
    'wizard.progress.aria': 'Progression du wizard',
    'wizard.toc.aria': 'Étapes du wizard',
    'wizard.progress.label': 'Étape',
    'wizard.aria.decrement': 'Diminuer',
    'wizard.aria.increment': 'Augmenter',
    'wizard.action.autofill': 'Choisir pour moi',
    // Step intros / helpers (pédagogie débutant — plan 05 §D)
    'wizard.help.identity.intro':
      'On commence simple : le nom de ton aventurier·e, à quel niveau tu commences, et la boussole morale (alignement). Tu pourras tout changer plus tard.',
    'wizard.help.identity.levelHelper':
      "Niveau 1 si tu débutes. Tu commences au-dessus si ta table le permet.",
    'wizard.help.identity.alignmentHelper':
      "L'alignement résume comment ton personnage voit le monde. Indicatif, pas une cage.",
    'wizard.help.class.intro':
      "Ta classe, c'est ton métier d'aventurier. Elle définit ce que tu sais faire (taper fort, lancer des sorts, soigner…) et comment tu progresses. Survole une classe pour voir si elle te ressemble.",
    'wizard.help.ancestry.intro':
      "L'ascendance, c'est d'où tu viens — humain, elfe, nain, etc. Elle donne quelques bonus naturels et un peu de couleur à ton personnage.",
    'wizard.help.abilities.intro':
      "Six caractéristiques chiffrées définissent ce que tu es bon à faire. La méthode « Tableau standard » est la plus simple ; « Achat de points » donne plus de contrôle ; « Manuel » te laisse mettre ce que tu veux (à valider avec ton MJ).",
    'wizard.help.abilities.method.standard-array':
      'Distribue les 6 valeurs 15, 14, 13, 12, 10 et 8 dans tes caractéristiques.',
    'wizard.help.abilities.method.point-buy':
      '27 points à dépenser, chaque caractéristique entre 8 et 15. Les hautes valeurs coûtent plus cher.',
    'wizard.help.abilities.method.manual': "Saisis librement (mode confiance MJ).",
    'wizard.help.abilities.recommended': 'Recommandée pour cette classe',
    'wizard.help.background.intro':
      "Qu'as-tu fait avant l'aventure ? Ton historique te donne des compétences, un peu d'équipement, et de la matière narrative.",
    'wizard.help.background.personalityIntro':
      'Optionnel mais sympa : un trait, un idéal, une attache, un défaut. C\'est ce qui rendra ton personnage vivant à table.',
    'wizard.help.skills.intro':
      "Les compétences sont les choses précises où tu es entraîné·e : grimper, mentir, soigner, repérer. Coche celles qui collent à ton personnage.",
    'wizard.help.equipment.intro':
      "Ton paquetage de départ. Chaque classe propose une ou deux options — choisis celle qui te ressemble. L'historique ajoute quelques objets en plus.",
    'wizard.help.spells.intro':
      "Tu peux lancer des sorts ! Les sorts mineurs (cantrips) sont gratuits et illimités. Les sorts de niveau 1 consomment un emplacement à chaque lancement — tu en récupères tous au repos long. Survole un sort pour lire ses effets avant de choisir.",
    'wizard.help.recap.intro':
      "Voici ton personnage en clair. Tu peux modifier une section en cliquant sur ✎, ou créer la fiche directement.",
    'wizard.helpPanel.hint':
      'Survole un choix pour voir son aide.',
    // Lists / UI
    'wizard.class.list.aria': 'Liste des classes',
    'wizard.class.primary': 'Classe principale',
    'wizard.class.multiclass.title': 'Multi-classe (optionnel)',
    'wizard.class.multiclass.intro':
      "Tu peux répartir tes niveaux entre plusieurs classes. La somme doit égaler ton niveau total.",
    'wizard.class.multiclass.add': 'Ajouter une autre classe',
    'wizard.class.multiclass.cancel': 'Annuler',
    'wizard.class.multiclass.pick': 'Choisis la classe à ajouter',
    'wizard.class.multiclass.sumMismatch':
      'La somme des niveaux par classe ne correspond pas à ton niveau total.',
    'wizard.class.remove.aria': 'Retirer cette classe',
    'wizard.ancestry.list.aria': 'Liste des ascendances',
    'wizard.background.list.aria': 'Liste des historiques',
    'wizard.background.personality': 'Personnalité',
    'wizard.skills.toPick': 'Compétences à choisir',
    'wizard.skills.fromBackground': 'Via historique',
    'wizard.skills.fromAncestry': 'Via ascendance',
    'wizard.skills.fromClassExpertise': 'Expertise',
    'wizard.skills.notAllowed': 'Hors classe',
    'wizard.equipment.fromClass': 'Au choix',
    'wizard.equipment.fromBackground': 'Accordé par ton historique',
    'wizard.equipment.noItems': "Aucun objet — uniquement de l'or",
    'wizard.spells.noCaster': "Aucune classe lanceuse — pas de sorts à choisir.",
    'wizard.spells.preparedDaily':
      "Tu prépares tes sorts chaque matin (au repos long) — rien à choisir à la création.",
    'wizard.spells.helpHint': 'Survole un sort pour voir ce qu’il fait.',
    'wizard.spells.bundleEmpty':
      "Aucun sort n’a été trouvé dans le grimoire pour cette classe. Le contenu n’a pas été chargé correctement — recharge la page. Si le problème persiste, signale-le.",
    // Sous-choix d'ascendance — plan 13.8
    'wizard.subchoice.section.title': 'Précise ton ascendance',
    'wizard.subchoice.section.helper':
      'Quelques choix supplémentaires affinent ton personnage. Ils déterminent des aptitudes que tu utiliseras à la fiche.',
    'wizard.subchoice.dragonAncestry.legend': 'Type de dragon',
    'wizard.subchoice.dragonAncestry.helper':
      'Choisis le dragon dont tu descends. Cela fixe le type de dégâts de ton souffle et la résistance que tu possèdes.',
    'wizard.subchoice.dragonAncestry.impactPrefix': 'Dégâts et résistance',
    'wizard.subchoice.tieflingLegacy.legend': 'Héritage fiélon',
    'wizard.subchoice.tieflingLegacy.helper':
      'Trois lignées infernales possibles. Chacune débloque un sort mineur (cantrip) au niveau 1 et des sorts plus puissants aux niveaux 3 et 5, avec une résistance correspondante.',
    'wizard.subchoice.tieflingLegacy.resistancePrefix': 'Résistance',
    'wizard.subchoice.elfLineage.legend': 'Lignage elfique',
    'wizard.subchoice.elfLineage.helper':
      'Trois lignages possibles : Drow (vision dans le noir étendue), Haut-elfe (sortilèges arcaniques) ou Elfe sylvestre (mobilité accrue). Chacun apporte son propre cantrip.',
    'wizard.subchoice.gnomeLineage.legend': 'Lignage gnome',
    'wizard.subchoice.gnomeLineage.helper':
      "Forêts (illusion + parler aux animaux) ou Roches (réparation + petits appareils mécaniques).",
    'wizard.subchoice.goliathAncestry.legend': 'Ascendance gigante',
    'wizard.subchoice.goliathAncestry.helper':
      "Tu descends d'une lignée de géants. Choisis laquelle — chacune débloque un effet utilisable un nombre limité de fois par repos long.",
    'wizard.subchoice.ancestryCastingAbility.legend': "Caractéristique d'incantation",
    'wizard.subchoice.ancestryCastingAbility.helper':
      "Cette caractéristique détermine la puissance des sorts liés à ton ascendance. Choisis selon le personnage que tu joues.",
    'wizard.subchoice.ancestryCastingAbility.int.description':
      "Savoir étudié, analyse, théorie magique.",
    'wizard.subchoice.ancestryCastingAbility.sag.description':
      "Intuition, instinct, perception de l’invisible.",
    'wizard.subchoice.ancestryCastingAbility.cha.description':
      "Présence, force de persuasion, conviction.",
    'wizard.subchoice.ancestryExtraSkill.legend': 'Compétence supplémentaire',
    'wizard.subchoice.ancestryExtraSkill.elfHelper':
      "Sens Aiguisés (Elfe) : choisis une compétence parmi Perspicacité, Perception ou Survie.",
    'wizard.subchoice.ancestryExtraSkill.humanHelper':
      "Compétent (Humain) : maîtrise une compétence supplémentaire de ton choix.",
    'wizard.subchoice.ancestrySize.legend': 'Taille',
    'wizard.subchoice.ancestrySize.helper':
      'Influence ton encombrement en combat, les armes lourdes que tu peux manier et la monture qui peut te porter.',
    'wizard.subchoice.ancestrySize.small.title': 'Petite (P)',
    'wizard.subchoice.ancestrySize.small.impact':
      "Tu peux te déplacer dans l'espace d'une créature plus grande, mais tu utilises les armes lourdes avec désavantage.",
    'wizard.subchoice.ancestrySize.medium.title': 'Moyenne (M)',
    'wizard.subchoice.ancestrySize.medium.impact':
      "Aucune restriction sur les armes. Taille humaine standard.",
    'wizard.subchoice.unmet.aria':
      "Certains sous-choix d'ascendance restent à poser avant de continuer.",
    'wizard.subchoice.missingData.title': 'Options indisponibles',
    'wizard.subchoice.missingData.body':
      "Les options de ce sous-choix n'ont pas été chargées correctement. Le cache local a été invalidé en arrière-plan — recharge la page (F5) pour les afficher. Si le problème persiste, signale-le.",
    'wizard.helpPanel.viewDetail': 'Voir le détail',
    'wizard.helpPanel.close': 'Fermer',
    // Spell detail panel
    'spell.level.cantrip': 'Sort mineur (cantrip)',
    'spell.level.prefix': 'Niveau',
    'spell.meta.castingTime': 'Temps d’incantation',
    'spell.meta.range': 'Portée',
    'spell.meta.duration': 'Durée',
    'spell.meta.components': 'Composantes',
    'spell.meta.atHigherLevels': 'À niveau supérieur',
    'spell.flag.concentration': 'Concentration',
    'spell.flag.ritual': 'Rituel',
    // Gloses débutant — expliquent V/S/M et les drapeaux sans jargon D&D
    'spell.component.verbal.label': 'Verbale',
    'spell.component.verbal.hint': 'tu prononces une formule à voix haute',
    'spell.component.somatic.label': 'Somatique',
    'spell.component.somatic.hint': 'tu fais un geste précis de la main',
    'spell.component.material.label': 'Matérielle',
    'spell.component.material.hint': 'tu manipules un composant',
    'spell.gloss.concentration':
      "Tu dois te concentrer pour maintenir l'effet — un seul sort de concentration à la fois, et tu perds la concentration si tu subis des dégâts (jet de sauvegarde).",
    'spell.gloss.ritual':
      "Tu peux le lancer en 10 minutes supplémentaires sans consommer d'emplacement de sort.",
    // Recap (langage débutant — plan 05 §E.9)
    'wizard.recap.identity': 'Qui tu es',
    'wizard.recap.class': 'Ta classe',
    'wizard.recap.classSingular': 'Tu joues',
    'wizard.recap.classMulti': 'Tu joues plusieurs classes :',
    'wizard.recap.ancestry': 'Ton ascendance',
    'wizard.recap.ancestryYou': 'Tu es',
    'wizard.recap.speed': 'Vitesse',
    'wizard.recap.abilities': 'Tes caractéristiques',
    'wizard.recap.abilitiesIntro':
      'Voici tes scores et leurs modificateurs (le « +X » que tu ajouteras à tes jets).',
    'wizard.recap.background': 'Ton passé',
    'wizard.recap.backgroundIntro': "Ton historique :",
    'wizard.recap.skills': 'Tes compétences',
    'wizard.recap.skillsIntro': 'Tu es entraîné·e dans :',
    'wizard.recap.skillsNone': 'Aucune compétence supplémentaire.',
    'wizard.recap.equipment': 'Ton équipement',
    'wizard.recap.equipmentIntro':
      'Ton sac est prêt — tu pourras le détailler depuis la fiche.',
    'wizard.recap.combat': 'Au combat',
    'wizard.recap.combatHp': 'Tu commences avec',
    'wizard.recap.hpExplanation':
      'points de vie. Quand tu tombes à 0, tu fais des jets de sauvegarde contre la mort.',
    'wizard.recap.combatAc': 'Ta classe d’armure est',
    'wizard.recap.acExplanation':
      '— les attaquants doivent dépasser ce nombre pour te toucher.',
    'wizard.recap.combatProf': 'Ton bonus de maîtrise est de',
    'wizard.recap.profExplanation':
      "— tu l'ajoutes à tes jets quand tu es entraîné·e.",
    'wizard.recap.level': 'Niveau',
    'wizard.recap.edit': 'Modifier',
    'wizard.recap.editAria': 'Modifier la section',
    // Errors + toasts
    'wizard.error.nameRequired': 'Le nom est requis.',
    'wizard.error.authNotReady':
      "Ton compte n'est pas prêt. Recharge la page si ça persiste.",
    'wizard.error.incompleteDraft':
      'Ton personnage est incomplet — finis les étapes précédentes avant de créer.',
    'wizard.toast.created.title': 'Personnage créé !',
    // Sheet
    'sheet.notFound': 'Personnage introuvable',
    'sheet.notFound.hint': "Aucune fiche à cet emplacement. Elle a peut-être été supprimée.",
    'sheet.backHome': 'Retour à la bibliothèque',
    'sheet.error.title': 'Erreur de chargement',
    'sheet.statusStrip.aria': 'Statistiques vitales',
    'sheet.modeTabs.aria': 'Sections de la fiche',
    'sheet.stat.hp': 'PV',
    'sheet.stat.ac': 'CA',
    'sheet.stat.init': 'Init',
    'sheet.stat.speed': 'Vit.',
    'sheet.mode.combat': 'Combat',
    'sheet.mode.essence': 'Essence',
    'sheet.mode.magie': 'Magie',
    'sheet.mode.avoir': 'Avoir',
    'sheet.mode.ame': 'Âme',
    'sheet.placeholder.todo': 'Section à venir dans un prochain plan.',
    'sheet.magie.ancestry.tieflingTitle': "Sorts d'héritage fiélon",
    'sheet.magie.ancestry.elfTitle': 'Sorts de lignage elfique',
    'sheet.magie.ancestry.gnomeTitle': 'Sorts de lignage gnome',
    'sheet.magie.ancestry.genericTitle': "Sorts d'ascendance",
    // Nav shell
    'nav.aria': 'Navigation principale',
    'nav.brand.aria': "Retour à l'accueil",
    'nav.back': 'Retour',
    'nav.back.aria': 'Retour à la bibliothèque',
    'nav.avatar.aria': 'Compte (à venir)',
    // Library
    'library.title': 'Bibliothèque',
    'library.subtitle': 'Tes héros et héroïnes',
    'library.cta.create': 'Créer un personnage',
    'library.empty.title': 'Aucun héros pour l’instant',
    'library.empty.body':
      "Crée ton premier personnage pour commencer l'aventure. Une fiche, une voix, un nom à graver sur le grimoire.",
    'library.error.title': 'Lecture impossible',
    'library.error.body':
      'Impossible de récupérer tes personnages. Vérifie ta connexion et réessaye.',
    'library.error.retry': 'Réessayer',
    'library.list.aria': 'Liste des personnages',
    'library.card.open': 'Ouvrir la fiche de',
    'library.card.level': 'Niveau',
    'library.card.aliveLabel': 'En vie',
    'library.card.deadLabel': 'Mort.e',
    // Avoir
    'avoir.customItem.placeholder': 'Mon trésor personnel',
  },
  en: {
    'splash.brand': 'GrimWar',
    'splash.loading': 'Summoning…',
    'auth.placeholder.email': 'Email address',
    'auth.placeholder.password': 'Password',
    'school.abjuration': 'Abjuration',
    'school.conjuration': 'Conjuration',
    'school.divination': 'Divination',
    'school.enchantment': 'Enchantment',
    'school.evocation': 'Evocation',
    'school.illusion': 'Illusion',
    'school.necromancy': 'Necromancy',
    'school.transmutation': 'Transmutation',
    'ability.for': 'Strength',
    'ability.dex': 'Dexterity',
    'ability.con': 'Constitution',
    'ability.int': 'Intelligence',
    'ability.sag': 'Wisdom',
    'ability.cha': 'Charisma',
    'rarity.common': 'Common',
    'rarity.uncommon': 'Uncommon',
    'rarity.rare': 'Rare',
    'rarity.very rare': 'Very rare',
    'rarity.legendary': 'Legendary',
    'rarity.artifact': 'Artifact',
    'item.category.weapon': 'Weapon',
    'item.category.armor': 'Armor',
    'item.category.shield': 'Shield',
    'item.category.gear': 'Gear',
    'item.category.tool': 'Tool',
    'item.category.pack': 'Pack',
    'item.category.mount': 'Mount',
    'item.category.vehicle': 'Vehicle',
    'wizard.title': 'Create a character',
    'wizard.subtitle':
      "We'll walk you through it. Pick what speaks to you — we handle the rules.",
    'wizard.step.identity.title': 'Identity',
    'wizard.step.class.title': 'Class',
    'wizard.step.ancestry.title': 'Ancestry',
    'wizard.step.abilities.title': 'Ability scores',
    'wizard.step.background.title': 'Background',
    'wizard.step.skills.title': 'Skills',
    'wizard.step.equipment.title': 'Equipment',
    'wizard.step.spells.title': 'Spells',
    'wizard.step.recap.title': 'Summary',
    'wizard.field.name': 'Name',
    'wizard.field.level': 'Level',
    'wizard.field.alignment': 'Alignment',
    'wizard.field.subancestry': 'Subancestry',
    'wizard.field.method': 'Method',
    'wizard.field.trait': 'Personality trait',
    'wizard.field.ideal': 'Ideal',
    'wizard.field.bond': 'Bond',
    'wizard.field.flaw': 'Flaw',
    'wizard.method.standard-array': 'Standard Array',
    'wizard.method.point-buy': 'Point Buy',
    'wizard.method.manual': 'Manual',
    'wizard.label.pointsRemaining': 'Points remaining',
    'wizard.label.cantrips': 'Cantrips',
    'wizard.label.level1Spells': 'Level-1 spells',
    'wizard.label.option': 'Option',
    'wizard.label.cost': 'Cost',
    'wizard.placeholder.name': 'Adventurer name',
    'wizard.placeholder.choose': 'Choose…',
    'wizard.button.create': 'Create character',
    'wizard.button.creating': 'Creating…',
    'wizard.nav.previous': 'Previous',
    'wizard.nav.next': 'Next',
    'wizard.nav.invalidStep': 'Finish this step to continue.',
    'wizard.progress.aria': 'Wizard progress',
    'wizard.toc.aria': 'Wizard steps',
    'wizard.progress.label': 'Step',
    'wizard.aria.decrement': 'Decrease',
    'wizard.aria.increment': 'Increase',
    'wizard.action.autofill': 'Choose for me',
    'wizard.help.identity.intro':
      "Start simple: your adventurer's name, starting level, and moral compass.",
    'wizard.help.identity.levelHelper': 'Level 1 if you are new.',
    'wizard.help.identity.alignmentHelper':
      'Alignment hints at how your character sees the world.',
    'wizard.help.class.intro':
      'Your class is your adventuring profession.',
    'wizard.help.ancestry.intro':
      'Where you come from — gives natural bonuses and flavor.',
    'wizard.help.abilities.intro':
      'Six ability scores define what you are good at.',
    'wizard.help.abilities.method.standard-array':
      'Distribute the six fixed values among your abilities.',
    'wizard.help.abilities.method.point-buy':
      '27 points to spend, each ability between 8 and 15.',
    'wizard.help.abilities.method.manual': 'Free entry (DM trust mode).',
    'wizard.help.abilities.recommended': 'Recommended for this class',
    'wizard.help.background.intro':
      'What did you do before the adventure?',
    'wizard.help.background.personalityIntro':
      'Optional but rewarding: a trait, ideal, bond, flaw.',
    'wizard.help.skills.intro':
      'The specific things you are trained in.',
    'wizard.help.equipment.intro': 'Your starting kit.',
    'wizard.help.spells.intro':
      'You can cast spells! Cantrips are free and unlimited. Level-1 spells consume a slot each cast — you recover them all on a long rest. Hover a spell to read its effects before choosing.',
    'wizard.help.recap.intro': 'Your character in plain words.',
    'wizard.helpPanel.hint': 'Hover a choice to see its help.',
    'wizard.class.list.aria': 'Class list',
    'wizard.class.primary': 'Primary class',
    'wizard.class.multiclass.title': 'Multi-classing (optional)',
    'wizard.class.multiclass.intro': 'Split your levels across classes.',
    'wizard.class.multiclass.add': 'Add another class',
    'wizard.class.multiclass.cancel': 'Cancel',
    'wizard.class.multiclass.pick': 'Pick the class to add',
    'wizard.class.multiclass.sumMismatch':
      'Sum of class levels does not match total level.',
    'wizard.class.remove.aria': 'Remove this class',
    'wizard.ancestry.list.aria': 'Ancestry list',
    'wizard.background.list.aria': 'Background list',
    'wizard.background.personality': 'Personality',
    'wizard.skills.toPick': 'Skills to pick',
    'wizard.skills.fromBackground': 'Via background',
    'wizard.skills.fromAncestry': 'Via ancestry',
    'wizard.skills.fromClassExpertise': 'Expertise',
    'wizard.skills.notAllowed': 'Off-class',
    'wizard.equipment.fromClass': 'Choose',
    'wizard.equipment.fromBackground': 'Granted by your background',
    'wizard.equipment.noItems': 'No items — gold only',
    'wizard.spells.noCaster': 'No spellcasting class.',
    'wizard.spells.preparedDaily':
      'You prepare your spells each long rest — nothing to pick at creation.',
    'wizard.spells.helpHint': 'Hover a spell to see what it does.',
    'wizard.spells.bundleEmpty':
      'No spells found in the grimoire for this class. The content failed to load — reload the page. If it persists, report it.',
    // Ancestry sub-choices — plan 13.8
    'wizard.subchoice.section.title': 'Refine your ancestry',
    'wizard.subchoice.section.helper':
      'A few extra choices shape your character. They unlock abilities you will use on your sheet.',
    'wizard.subchoice.dragonAncestry.legend': 'Dragon type',
    'wizard.subchoice.dragonAncestry.helper':
      'Pick the dragon you descend from. This sets your breath damage type and the matching resistance.',
    'wizard.subchoice.dragonAncestry.impactPrefix': 'Damage and resistance',
    'wizard.subchoice.tieflingLegacy.legend': 'Fiendish legacy',
    'wizard.subchoice.tieflingLegacy.helper':
      'Three infernal lineages. Each grants a level 1 cantrip and stronger spells at levels 3 and 5, plus a matching resistance.',
    'wizard.subchoice.tieflingLegacy.resistancePrefix': 'Resistance',
    'wizard.subchoice.elfLineage.legend': 'Elven lineage',
    'wizard.subchoice.elfLineage.helper':
      'Three options: Drow (extended darkvision), High Elf (arcane spell flexibility), or Wood Elf (extra speed). Each grants its own cantrip.',
    'wizard.subchoice.gnomeLineage.legend': 'Gnomish lineage',
    'wizard.subchoice.gnomeLineage.helper':
      'Forest (illusion + speak with animals) or Rock (mending + tiny clockwork devices).',
    'wizard.subchoice.goliathAncestry.legend': 'Giant ancestry',
    'wizard.subchoice.goliathAncestry.helper':
      'You descend from a giant lineage. Pick which one — each unlocks an effect usable a limited number of times per long rest.',
    'wizard.subchoice.ancestryCastingAbility.legend': 'Spellcasting ability',
    'wizard.subchoice.ancestryCastingAbility.helper':
      'This ability sets the power of the spells tied to your ancestry. Pick to match your character concept.',
    'wizard.subchoice.ancestryCastingAbility.int.description':
      'Studied knowledge, analysis, magical theory.',
    'wizard.subchoice.ancestryCastingAbility.sag.description':
      'Intuition, instinct, awareness of the unseen.',
    'wizard.subchoice.ancestryCastingAbility.cha.description':
      'Presence, conviction, force of personality.',
    'wizard.subchoice.ancestryExtraSkill.legend': 'Extra skill',
    'wizard.subchoice.ancestryExtraSkill.elfHelper':
      'Keen Senses (Elf): pick one skill among Insight, Perception or Survival.',
    'wizard.subchoice.ancestryExtraSkill.humanHelper':
      'Skillful (Human): proficiency in one additional skill of your choice.',
    'wizard.subchoice.ancestrySize.legend': 'Size',
    'wizard.subchoice.ancestrySize.helper':
      'Affects your combat footprint, heavy-weapon handling, and which mounts can carry you.',
    'wizard.subchoice.ancestrySize.small.title': 'Small (S)',
    'wizard.subchoice.ancestrySize.small.impact':
      "You can move through a larger creature's space, but you wield heavy weapons with disadvantage.",
    'wizard.subchoice.ancestrySize.medium.title': 'Medium (M)',
    'wizard.subchoice.ancestrySize.medium.impact':
      'No restriction on weapons. Standard human-size build.',
    'wizard.subchoice.unmet.aria':
      "Some ancestry sub-choices remain to be set before you can continue.",
    'wizard.subchoice.missingData.title': 'Options unavailable',
    'wizard.subchoice.missingData.body':
      'Sub-choice options failed to load. The local cache was invalidated in the background — reload the page (F5) to display them. If the problem persists, report it.',
    'wizard.helpPanel.viewDetail': 'See details',
    'wizard.helpPanel.close': 'Close',
    // Spell detail panel
    'spell.level.cantrip': 'Cantrip',
    'spell.level.prefix': 'Level',
    'spell.meta.castingTime': 'Casting time',
    'spell.meta.range': 'Range',
    'spell.meta.duration': 'Duration',
    'spell.meta.components': 'Components',
    'spell.meta.atHigherLevels': 'At higher levels',
    'spell.flag.concentration': 'Concentration',
    'spell.flag.ritual': 'Ritual',
    'spell.component.verbal.label': 'Verbal',
    'spell.component.verbal.hint': 'you speak the spell aloud',
    'spell.component.somatic.label': 'Somatic',
    'spell.component.somatic.hint': 'you make a precise hand gesture',
    'spell.component.material.label': 'Material',
    'spell.component.material.hint': 'you handle a component',
    'spell.gloss.concentration':
      'You must concentrate to keep the effect — only one concentration spell at a time, and damage forces a save to keep it.',
    'spell.gloss.ritual':
      'Can be cast in 10 extra minutes without spending a spell slot.',
    'wizard.recap.identity': 'Who you are',
    'wizard.recap.class': 'Your class',
    'wizard.recap.classSingular': 'You play',
    'wizard.recap.classMulti': 'You play several classes:',
    'wizard.recap.ancestry': 'Your ancestry',
    'wizard.recap.ancestryYou': 'You are',
    'wizard.recap.speed': 'Speed',
    'wizard.recap.abilities': 'Your abilities',
    'wizard.recap.abilitiesIntro':
      'Your scores and modifiers (the « +X » you add to rolls).',
    'wizard.recap.background': 'Your past',
    'wizard.recap.backgroundIntro': 'Your background:',
    'wizard.recap.skills': 'Your skills',
    'wizard.recap.skillsIntro': 'You are trained in:',
    'wizard.recap.skillsNone': 'No extra skills.',
    'wizard.recap.equipment': 'Your equipment',
    'wizard.recap.equipmentIntro': 'Your kit is ready.',
    'wizard.recap.combat': 'In combat',
    'wizard.recap.combatHp': 'You start with',
    'wizard.recap.hpExplanation': 'hit points.',
    'wizard.recap.combatAc': 'Your armor class is',
    'wizard.recap.acExplanation':
      '— attackers must exceed this to hit you.',
    'wizard.recap.combatProf': 'Your proficiency bonus is',
    'wizard.recap.profExplanation':
      '— add it to your rolls when trained.',
    'wizard.recap.level': 'Level',
    'wizard.recap.edit': 'Edit',
    'wizard.recap.editAria': 'Edit section',
    'wizard.error.nameRequired': 'Name is required.',
    'wizard.error.authNotReady':
      'Your account is not ready. Reload if this persists.',
    'wizard.error.incompleteDraft':
      'Your character is incomplete — finish the previous steps first.',
    'wizard.toast.created.title': 'Character created!',
    // Sheet
    'sheet.notFound': 'Character not found',
    'sheet.notFound.hint': "No character at this location. It may have been deleted.",
    'sheet.backHome': 'Back to library',
    'sheet.error.title': 'Loading error',
    'sheet.statusStrip.aria': 'Vital statistics',
    'sheet.modeTabs.aria': 'Sheet sections',
    'sheet.stat.hp': 'HP',
    'sheet.stat.ac': 'AC',
    'sheet.stat.init': 'Init',
    'sheet.stat.speed': 'Spd',
    'sheet.mode.combat': 'Combat',
    'sheet.mode.essence': 'Essence',
    'sheet.mode.magie': 'Magic',
    'sheet.mode.avoir': 'Inv.',
    'sheet.mode.ame': 'Soul',
    'sheet.placeholder.todo': 'Section coming in a later plan.',
    'sheet.magie.ancestry.tieflingTitle': 'Fiendish legacy spells',
    'sheet.magie.ancestry.elfTitle': 'Elven lineage spells',
    'sheet.magie.ancestry.gnomeTitle': 'Gnomish lineage spells',
    'sheet.magie.ancestry.genericTitle': 'Ancestry spells',
    'nav.aria': 'Main navigation',
    'nav.brand.aria': 'Back to home',
    'nav.back': 'Back',
    'nav.back.aria': 'Back to library',
    'nav.avatar.aria': 'Account (coming soon)',
    'library.title': 'Library',
    'library.subtitle': 'Your heroes and heroines',
    'library.cta.create': 'Create a character',
    'library.empty.title': 'No heroes yet',
    'library.empty.body':
      'Create your first character to begin the adventure. A sheet, a voice, a name to carve on the grimoire.',
    'library.error.title': 'Cannot load',
    'library.error.body':
      'Could not fetch your characters. Check your connection and try again.',
    'library.error.retry': 'Retry',
    'library.list.aria': 'Character list',
    'library.card.open': 'Open sheet of',
    'library.card.level': 'Level',
    'library.card.aliveLabel': 'Alive',
    'library.card.deadLabel': 'Dead',
    'avoir.customItem.placeholder': 'My personal treasure',
  },
};

export function t(key: StringKey, locale?: Locale): string {
  const lang = locale ?? useLocaleStore.getState().locale;
  return STRINGS[lang][key] ?? STRINGS.fr[key];
}

/**
 * Résout un objet i18n type `{ fr: '…', en?: '…' }` en string selon la locale.
 * Fallback FR systématique pour ne jamais afficher de clé brute à l'utilisateur.
 */
export type I18nString = { fr: string; en?: string };

export function localize(value: I18nString, locale?: Locale): string {
  const lang = locale ?? useLocaleStore.getState().locale;
  return value[lang] ?? value.fr;
}
