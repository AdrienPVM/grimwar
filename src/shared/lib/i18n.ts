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
  // Wizard manual
  | 'wizard.title'
  | 'wizard.section.identity'
  | 'wizard.section.lineage'
  | 'wizard.section.class'
  | 'wizard.section.background'
  | 'wizard.section.abilities'
  | 'wizard.section.combat'
  | 'wizard.section.proficiencies'
  | 'wizard.section.spells'
  | 'wizard.section.equipment'
  | 'wizard.field.name'
  | 'wizard.field.level'
  | 'wizard.field.alignment'
  | 'wizard.field.ancestry'
  | 'wizard.field.subancestry'
  | 'wizard.field.class'
  | 'wizard.field.subclass'
  | 'wizard.field.background'
  | 'wizard.field.method'
  | 'wizard.field.hp'
  | 'wizard.field.ac'
  | 'wizard.field.speed'
  | 'wizard.field.initiative'
  | 'wizard.method.standard-array'
  | 'wizard.method.point-buy'
  | 'wizard.method.manual'
  | 'wizard.label.modifier'
  | 'wizard.label.afterAncestry'
  | 'wizard.label.pointsRemaining'
  | 'wizard.label.cantrips'
  | 'wizard.label.level1Spells'
  | 'wizard.label.option'
  | 'wizard.label.startingCoins'
  | 'wizard.label.from'
  | 'wizard.label.skillsToPick'
  | 'wizard.placeholder.name'
  | 'wizard.placeholder.choose'
  | 'wizard.button.create'
  | 'wizard.button.creating'
  | 'wizard.button.reset'
  | 'wizard.error.nameRequired'
  | 'wizard.error.classRequired'
  | 'wizard.error.ancestryRequired'
  | 'wizard.error.backgroundRequired'
  | 'wizard.error.spellcasterIncomplete'
  | 'wizard.notice.spellcasterOnly'
  | 'wizard.notice.draftSaved'
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
    // Wizard manual
    'wizard.title': 'Créer un personnage',
    'wizard.section.identity': 'Identité',
    'wizard.section.lineage': 'Lignée',
    'wizard.section.class': 'Classe',
    'wizard.section.background': 'Historique',
    'wizard.section.abilities': 'Caractéristiques',
    'wizard.section.combat': 'Combat de base',
    'wizard.section.proficiencies': 'Maîtrises',
    'wizard.section.spells': 'Sorts',
    'wizard.section.equipment': 'Équipement de départ',
    'wizard.field.name': 'Nom',
    'wizard.field.level': 'Niveau',
    'wizard.field.alignment': 'Alignement',
    'wizard.field.ancestry': 'Espèce',
    'wizard.field.subancestry': 'Sous-espèce',
    'wizard.field.class': 'Classe',
    'wizard.field.subclass': 'Sous-classe',
    'wizard.field.background': 'Historique',
    'wizard.field.method': 'Méthode',
    'wizard.field.hp': 'PV max',
    'wizard.field.ac': 'CA',
    'wizard.field.speed': 'Vitesse',
    'wizard.field.initiative': 'Initiative',
    'wizard.method.standard-array': 'Tableau standard',
    'wizard.method.point-buy': 'Achat de points',
    'wizard.method.manual': 'Manuel',
    'wizard.label.modifier': 'Mod.',
    'wizard.label.afterAncestry': 'Après lignée',
    'wizard.label.pointsRemaining': 'Points restants',
    'wizard.label.cantrips': 'Sorts mineurs',
    'wizard.label.level1Spells': 'Sorts de niveau 1',
    'wizard.label.option': 'Option',
    'wizard.label.startingCoins': 'Pièces de départ',
    'wizard.label.from': 'parmi',
    'wizard.label.skillsToPick': 'Compétences à choisir',
    'wizard.placeholder.name': "Nom de l'aventurier",
    'wizard.placeholder.choose': 'Choisir…',
    'wizard.button.create': 'Créer le personnage',
    'wizard.button.creating': 'Création…',
    'wizard.button.reset': 'Réinitialiser',
    'wizard.error.nameRequired': 'Le nom est requis.',
    'wizard.error.classRequired': 'Choisis une classe.',
    'wizard.error.ancestryRequired': 'Choisis une espèce.',
    'wizard.error.backgroundRequired': 'Choisis un historique.',
    'wizard.error.spellcasterIncomplete': 'Choisis tes sorts.',
    'wizard.notice.spellcasterOnly': 'Section disponible si la classe est lanceuse de sorts.',
    'wizard.notice.draftSaved': 'Brouillon sauvegardé localement.',
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
    'wizard.section.identity': 'Identity',
    'wizard.section.lineage': 'Lineage',
    'wizard.section.class': 'Class',
    'wizard.section.background': 'Background',
    'wizard.section.abilities': 'Ability scores',
    'wizard.section.combat': 'Combat basics',
    'wizard.section.proficiencies': 'Proficiencies',
    'wizard.section.spells': 'Spells',
    'wizard.section.equipment': 'Starting equipment',
    'wizard.field.name': 'Name',
    'wizard.field.level': 'Level',
    'wizard.field.alignment': 'Alignment',
    'wizard.field.ancestry': 'Species',
    'wizard.field.subancestry': 'Subspecies',
    'wizard.field.class': 'Class',
    'wizard.field.subclass': 'Subclass',
    'wizard.field.background': 'Background',
    'wizard.field.method': 'Method',
    'wizard.field.hp': 'Max HP',
    'wizard.field.ac': 'AC',
    'wizard.field.speed': 'Speed',
    'wizard.field.initiative': 'Initiative',
    'wizard.method.standard-array': 'Standard Array',
    'wizard.method.point-buy': 'Point Buy',
    'wizard.method.manual': 'Manual',
    'wizard.label.modifier': 'Mod.',
    'wizard.label.afterAncestry': 'After lineage',
    'wizard.label.pointsRemaining': 'Points remaining',
    'wizard.label.cantrips': 'Cantrips',
    'wizard.label.level1Spells': 'Level-1 spells',
    'wizard.label.option': 'Option',
    'wizard.label.startingCoins': 'Starting coins',
    'wizard.label.from': 'from',
    'wizard.label.skillsToPick': 'Skills to pick',
    'wizard.placeholder.name': 'Adventurer name',
    'wizard.placeholder.choose': 'Choose…',
    'wizard.button.create': 'Create character',
    'wizard.button.creating': 'Creating…',
    'wizard.button.reset': 'Reset',
    'wizard.error.nameRequired': 'Name is required.',
    'wizard.error.classRequired': 'Pick a class.',
    'wizard.error.ancestryRequired': 'Pick a species.',
    'wizard.error.backgroundRequired': 'Pick a background.',
    'wizard.error.spellcasterIncomplete': 'Pick your spells.',
    'wizard.notice.spellcasterOnly': 'Section available if the class is a spellcaster.',
    'wizard.notice.draftSaved': 'Draft saved locally.',
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
