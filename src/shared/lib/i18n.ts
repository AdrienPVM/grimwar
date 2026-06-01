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
  | 'wizard.method.rolled'
  | 'wizard.method.manual'
  | 'wizard.method.rolled.source.app'
  | 'wizard.method.rolled.source.manual'
  | 'wizard.label.rollSource'
  | 'wizard.label.rolledBreakdown'
  | 'wizard.action.rollAbilities'
  | 'wizard.action.reroll'
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
  | 'wizard.help.abilities.method.rolled'
  | 'wizard.help.abilities.method.manual'
  | 'wizard.help.abilities.rolled.app'
  | 'wizard.help.abilities.rolled.manual'
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
  // UAT 2026-05-17, périmètre restreint plan 13.9 UAT 2026-05-18). Apparaît
  // UNIQUEMENT quand la donnée du bundle disque est absente (vrai bug cache/
  // parse). Pour un pool **calculé** légitimement vide (dépendances pas encore
  // résolues), utiliser le pattern `wizard.subchoice.pending.*` ci-dessous.
  | 'wizard.subchoice.missingData.title'
  | 'wizard.subchoice.missingData.body'
  // Message d'attente neutre (NON alarmant) pour les choosers dont le pool est
  // calculé à partir d'autres étapes — l'utilisateur doit d'abord remplir ces
  // étapes. Distinct de `missingData` qui crierait "panne" à tort.
  | 'wizard.subchoice.pending.expertiseAtClassStep'
  | 'wizard.subchoice.pending.expertiseNoSkills'
  // Sous-choix de classe (plan 13.9) — choosers + helpers + section ombrella
  | 'wizard.subchoice.class.section.title'
  | 'wizard.subchoice.class.section.helper'
  | 'wizard.subchoice.divineOrder.legend'
  | 'wizard.subchoice.divineOrder.helper'
  | 'wizard.subchoice.primalOrder.legend'
  | 'wizard.subchoice.primalOrder.helper'
  | 'wizard.subchoice.fightingStyle.legend'
  | 'wizard.subchoice.fightingStyle.helper'
  | 'wizard.subchoice.weaponMastery.legend'
  | 'wizard.subchoice.weaponMastery.helper'
  | 'wizard.subchoice.weaponMastery.remaining'
  | 'wizard.subchoice.weaponMastery.propertyPrefix'
  | 'wizard.subchoice.expertise.legend'
  | 'wizard.subchoice.expertise.helper'
  | 'wizard.subchoice.expertise.remaining'
  | 'wizard.subchoice.eldritchInvocation.legend'
  | 'wizard.subchoice.eldritchInvocation.helper'
  | 'wizard.subchoice.extraLanguages.legend'
  | 'wizard.subchoice.extraLanguages.helper'
  | 'wizard.subchoice.extraLanguages.remaining'
  | 'wizard.subchoice.extraLanguages.tierStandard'
  | 'wizard.subchoice.extraLanguages.tierRare'
  | 'wizard.subchoice.wizardSpellbook.inscribedLegend'
  | 'wizard.subchoice.wizardSpellbook.inscribedHelper'
  | 'wizard.subchoice.wizardSpellbook.preparedLegend'
  | 'wizard.subchoice.wizardSpellbook.preparedHelper'
  | 'wizard.subchoice.wizardSpellbook.preparedEmpty'
  | 'wizard.subchoice.pactOfTheTome.cantripsLegend'
  | 'wizard.subchoice.pactOfTheTome.cantripsHelper'
  | 'wizard.subchoice.pactOfTheTome.ritualsLegend'
  | 'wizard.subchoice.pactOfTheTome.ritualsHelper'
  | 'wizard.subchoice.pactOfTheBlade.legend'
  | 'wizard.subchoice.pactOfTheBlade.helper'
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
  // Sorts d'ascendance — plan 13.8 / 13.8b
  | 'sheet.magie.ancestry.tieflingTitle'
  | 'sheet.magie.ancestry.elfTitle'
  | 'sheet.magie.ancestry.gnomeTitle'
  | 'sheet.magie.ancestry.genericTitle'
  // Label de source pour les sorts de trait COMMUN à l'ascendance (plan 13.14b
  // D18) — distinct du label « Héritage X » des sous-choix. Tieffelin : trait
  // « Présence d'outre-monde » → thaumaturgie, commun aux 3 héritages.
  | 'sheet.magie.ancestry.tieflingCommonSource'
  | 'sheet.magie.cantNotImplementedAncestry'
  // Source des sorts grantés par l'invocation Pacte du grimoire (D13e-followup-
  // grant-display) — 3 sorts mineurs + 2 sorts L1 rituels au choix de n'importe
  // quelle classe, persistés dans `classes[warlock].pactTomeCantrips`/`.pactTomeRituals`.
  | 'sheet.magie.pactTome.sourceLabel'
  // Dégâts de sort canoniques (plan D1) — labels de mode de résolution
  | 'spell.damage.resolution.attack-roll'
  | 'spell.damage.resolution.saving-throw'
  | 'spell.damage.resolution.auto'
  // Manifestations occultes (Eldritch Invocations) — section structurée
  // « Mécanique » de la modale d'invocation (D13a).
  | 'sheet.essence.invocation.mechanicsTitle'
  | 'sheet.essence.invocation.armorOfShadows.label'
  | 'sheet.essence.invocation.armorOfShadows.condition'
  | 'sheet.essence.invocation.eldritchMind.label'
  | 'sheet.essence.invocation.eldritchMind.condition'
  | 'sheet.essence.invocation.pactOfTheBlade.label'
  | 'sheet.essence.invocation.pactOfTheBlade.action'
  | 'sheet.essence.invocation.pactOfTheBlade.weapon'
  | 'sheet.essence.invocation.pactOfTheBlade.attackAbility'
  | 'sheet.essence.invocation.pactOfTheBlade.damageTypes'
  | 'sheet.essence.invocation.pactOfTheBlade.deferred'
  | 'sheet.essence.invocation.pactOfTheChain.label'
  | 'sheet.essence.invocation.pactOfTheChain.action'
  | 'sheet.essence.invocation.pactOfTheChain.noSlot'
  | 'sheet.essence.invocation.pactOfTheChain.specialForms'
  | 'sheet.essence.invocation.pactOfTheChain.deferred'
  | 'sheet.essence.invocation.pactOfTheTome.label'
  | 'sheet.essence.invocation.pactOfTheTome.cantrips'
  | 'sheet.essence.invocation.pactOfTheTome.rituals'
  | 'sheet.essence.invocation.pactOfTheTome.focus'
  | 'sheet.essence.invocation.pactOfTheTome.deferred'
  // Combat — badge Weapon Mastery sur les armes équipées (plan 13.9 hotfix UAT)
  | 'sheet.combat.attacks.masteryBadgePrefix'
  | 'sheet.combat.attacks.masteryBadgeAria'
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
  | 'avoir.customItem.placeholder'
  // Connectivité (jalon 1D — mode offline)
  | 'connectivity.offline.title'
  | 'connectivity.offline.body'
  | 'connectivity.syncing.title'
  | 'connectivity.syncing.body'
  // Custom content — écran d'import (JALON 3B.4)
  | 'customContent.title'
  | 'customContent.subtitle'
  | 'customContent.dropzone.title'
  | 'customContent.dropzone.body'
  | 'customContent.dropzone.cta'
  | 'customContent.preview.title'
  | 'customContent.preview.metaAuthor'
  | 'customContent.preview.metaVersion'
  | 'customContent.preview.entities'
  | 'customContent.preview.import'
  | 'customContent.preview.cancel'
  | 'customContent.errors.title'
  | 'customContent.errors.scope.root'
  | 'customContent.errors.scope.meta'
  | 'customContent.errors.scope.entity'
  | 'customContent.errors.retry'
  | 'customContent.errors.parseJson'
  | 'customContent.list.title'
  | 'customContent.list.empty'
  | 'customContent.list.delete'
  | 'customContent.list.deleteConfirm'
  | 'customContent.toast.imported'
  | 'customContent.toast.importedSub'
  | 'customContent.toast.deleted'
  | 'customContent.toast.error'
  | 'customContent.category.spells'
  | 'customContent.category.classes'
  | 'customContent.category.subclasses'
  | 'customContent.category.ancestries'
  | 'customContent.category.subancestries'
  | 'customContent.category.backgrounds'
  | 'customContent.category.feats'
  | 'customContent.category.invocations'
  | 'customContent.category.items'
  // Pack editor — création in-app (JALON 3C.1)
  | 'customContent.createLink'
  | 'customContent.editor.title'
  | 'customContent.editor.subtitle'
  | 'customContent.editor.meta.title'
  | 'customContent.editor.meta.id'
  | 'customContent.editor.meta.idHelper'
  | 'customContent.editor.meta.nameFr'
  | 'customContent.editor.meta.nameEn'
  | 'customContent.editor.meta.author'
  | 'customContent.editor.meta.version'
  | 'customContent.editor.meta.versionHelper'
  | 'customContent.editor.meta.descriptionFr'
  | 'customContent.editor.meta.descriptionEn'
  | 'customContent.editor.meta.descriptionHelper'
  | 'customContent.editor.entities.title'
  | 'customContent.editor.feats.add'
  | 'customContent.editor.feats.empty'
  | 'customContent.editor.feats.remove'
  | 'customContent.editor.invocations.add'
  | 'customContent.editor.invocations.empty'
  | 'customContent.editor.invocations.remove'
  | 'customContent.editor.comingSoon.title'
  | 'customContent.editor.comingSoon.body'
  | 'customContent.editor.cancel'
  | 'customContent.editor.save'
  | 'customContent.editor.save.successTitle'
  | 'customContent.editor.save.successSub'
  | 'customContent.editor.save.errorTitle'
  | 'customContent.editor.save.errorGeneric'
  | 'customContent.editor.featForm.title'
  | 'customContent.editor.featForm.id'
  | 'customContent.editor.featForm.idHelper'
  | 'customContent.editor.featForm.nameFr'
  | 'customContent.editor.featForm.nameEn'
  | 'customContent.editor.featForm.summaryFr'
  | 'customContent.editor.featForm.summaryEn'
  | 'customContent.editor.featForm.summaryHelper'
  | 'customContent.editor.featForm.prerequisiteFr'
  | 'customContent.editor.featForm.prerequisiteEn'
  | 'customContent.editor.featForm.prerequisiteHelper'
  | 'customContent.editor.featForm.cancel'
  | 'customContent.editor.featForm.confirm'
  | 'customContent.editor.featForm.error.idRequired'
  | 'customContent.editor.featForm.error.idFormat'
  | 'customContent.editor.featForm.error.nameFrRequired'
  | 'customContent.editor.invocationForm.title'
  | 'customContent.editor.invocationForm.id'
  | 'customContent.editor.invocationForm.idHelper'
  | 'customContent.editor.invocationForm.nameFr'
  | 'customContent.editor.invocationForm.nameEn'
  | 'customContent.editor.invocationForm.summaryFr'
  | 'customContent.editor.invocationForm.summaryEn'
  | 'customContent.editor.invocationForm.summaryHelper'
  | 'customContent.editor.invocationForm.hasLevelPrereq'
  | 'customContent.editor.invocationForm.hasLevelPrereqHelper'
  | 'customContent.editor.invocationForm.warlockLevel'
  | 'customContent.editor.invocationForm.prerequisiteOtherFr'
  | 'customContent.editor.invocationForm.prerequisiteOtherEn'
  | 'customContent.editor.invocationForm.prerequisiteOtherHelper'
  | 'customContent.editor.invocationForm.cancel'
  | 'customContent.editor.invocationForm.confirm'
  | 'customContent.editor.invocationForm.error.idRequired'
  | 'customContent.editor.invocationForm.error.idFormat'
  | 'customContent.editor.invocationForm.error.nameFrRequired'
  | 'customContent.editor.invocationForm.error.summaryFrRequired'
  | 'customContent.editor.invocationForm.error.levelRange';

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
    'wizard.method.rolled': '4d6 (garde les 3 meilleurs)',
    'wizard.method.manual': 'Manuel',
    'wizard.method.rolled.source.app': "L'app lance les dés",
    'wizard.method.rolled.source.manual': 'Je lance avec mes dés (IRL)',
    'wizard.label.rollSource': 'Qui lance les dés ?',
    'wizard.label.rolledBreakdown': 'Détail du jet',
    'wizard.action.rollAbilities': 'Lancer 4d6 pour les 6 caractéristiques',
    'wizard.action.reroll': 'Relancer',
    'wizard.label.pointsRemaining': 'Points restants',
    'wizard.label.cantrips': 'Sorts mineurs',
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
      "Six caractéristiques chiffrées définissent ce que tu es bon à faire. La méthode « Tableau standard » est la plus simple ; « Achat de points » donne plus de contrôle ; « 4d6 (garde les 3 meilleurs) » lance les dés ; « Manuel » te laisse mettre ce que tu veux (à valider avec ton MJ).",
    'wizard.help.abilities.method.standard-array':
      'Distribue les 6 valeurs 15, 14, 13, 12, 10 et 8 dans tes caractéristiques.',
    'wizard.help.abilities.method.point-buy':
      '27 points à dépenser, chaque caractéristique entre 8 et 15. Les hautes valeurs coûtent plus cher.',
    'wizard.help.abilities.method.rolled':
      'Pour chaque caractéristique : lance 4d6 et garde les 3 meilleurs. Chaque score finit entre 3 et 18.',
    'wizard.help.abilities.method.manual': "Saisis librement (mode confiance MJ).",
    'wizard.help.abilities.rolled.app':
      "L'app lance les dés pour toi. Tu peux relancer si le résultat ne te convient pas.",
    'wizard.help.abilities.rolled.manual':
      "Lance tes propres dés à la table, puis saisis les 6 totaux ici (entre 3 et 18 chacun).",
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
      "Tu peux lancer des sorts ! Les sorts mineurs sont gratuits et illimités. Les sorts de niveau 1 consomment un emplacement à chaque lancement — tu en récupères tous au repos long. Survole un sort pour lire ses effets avant de choisir.",
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
      'Trois lignées infernales possibles. Chacune débloque un sort mineur au niveau 1 et des sorts plus puissants aux niveaux 3 et 5, avec une résistance correspondante.',
    'wizard.subchoice.tieflingLegacy.resistancePrefix': 'Résistance',
    'wizard.subchoice.elfLineage.legend': 'Lignage elfique',
    'wizard.subchoice.elfLineage.helper':
      'Trois lignages possibles : Drow (vision dans le noir étendue), Haut-elfe (sortilèges arcaniques) ou Elfe sylvestre (mobilité accrue). Chacun apporte son propre sort mineur.',
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
    // Messages d'attente neutres (PAS de "panne", PAS de "recharge la page") —
    // affichés quand un chooser dépend d'étapes encore à remplir.
    'wizard.subchoice.pending.expertiseAtClassStep':
      "L'Expertise se choisira à l'étape Compétences — sa liste dépend des compétences que tu maîtriseras.",
    'wizard.subchoice.pending.expertiseNoSkills':
      "Choisis d'abord tes compétences de classe ci-dessus — ton Expertise s'y prendra parmi elles.",
    // Sous-choix de classe (plan 13.9)
    'wizard.subchoice.class.section.title': 'Précise ta classe',
    'wizard.subchoice.class.section.helper':
      'Encore quelques choix qui fixent ton style de jeu. Tu pourras tout consulter à la fiche plus tard.',
    'wizard.subchoice.divineOrder.legend': 'Ordre divin',
    'wizard.subchoice.divineOrder.helper':
      'Deux écoles de clercs : Protecteur, en première ligne avec bouclier et armure lourde ; Thaumaturge, érudit des mystères divins avec un sort mineur supplémentaire.',
    'wizard.subchoice.primalOrder.legend': 'Ordre primordial',
    'wizard.subchoice.primalOrder.helper':
      'Deux voies de druides : Magicien (sortilèges + bonus aux tests Intelligence liés à la nature) ou Gardien (armes martiales + armure intermédiaire pour défendre physiquement la nature).',
    'wizard.subchoice.fightingStyle.legend': 'Style de combat',
    'wizard.subchoice.fightingStyle.helper':
      'Ta signature au combat. Chaque style apporte un avantage mécanique distinct — choisis selon ce que tu veux voir à la table.',
    'wizard.subchoice.weaponMastery.legend': "Bottes d'arme",
    'wizard.subchoice.weaponMastery.helper':
      'Choisis {count} arme(s) sur lesquelles tu maîtrises une botte spéciale (effet automatique chaque fois que tu touches). À combiner avec ton équipement de départ.',
    'wizard.subchoice.weaponMastery.remaining': 'encore {n} à choisir',
    'wizard.subchoice.weaponMastery.propertyPrefix': 'Botte',
    'wizard.subchoice.expertise.legend': 'Expertise',
    'wizard.subchoice.expertise.helper':
      'Choisis 2 compétences déjà maîtrisées — tu y ajoutes ton bonus de maîtrise une seconde fois (×2). Choisis tes signatures.',
    'wizard.subchoice.expertise.remaining': 'encore {n} à choisir',
    'wizard.subchoice.eldritchInvocation.legend': 'Manifestation occulte',
    'wizard.subchoice.eldritchInvocation.helper':
      'Ta connexion au patron prend une forme concrète. Les trois Pactes (Lame, Chaîne, Grimoire) débloquent du contenu de classe spécifique.',
    'wizard.subchoice.extraLanguages.legend': 'Langues supplémentaires',
    'wizard.subchoice.extraLanguages.helper':
      'Choisis {count} langue(s) supplémentaire(s) — utile pour les échanges diplomatiques, lire un parchemin antique ou comprendre un dragon.',
    'wizard.subchoice.extraLanguages.remaining': 'encore {n} à choisir',
    'wizard.subchoice.extraLanguages.tierStandard': 'Courante',
    'wizard.subchoice.extraLanguages.tierRare': 'Rare',
    'wizard.subchoice.wizardSpellbook.inscribedLegend':
      'Grimoire — sorts inscrits',
    'wizard.subchoice.wizardSpellbook.inscribedHelper':
      "Ton grimoire de départ contient {count} sorts de niveau 1. Ce sont les sorts que tu connais — tu pourras en préparer un sous-ensemble chaque matin.",
    'wizard.subchoice.wizardSpellbook.preparedLegend':
      'Sorts préparés aujourd’hui',
    'wizard.subchoice.wizardSpellbook.preparedHelper':
      "Choisis {count} sorts parmi ton grimoire — seuls les sorts préparés sont lançables aujourd'hui. Les autres restent inscrits mais inutilisables tant que tu ne les prépares pas.",
    'wizard.subchoice.wizardSpellbook.preparedEmpty':
      "Inscris d'abord les sorts dans ton grimoire ci-dessus.",
    // D13e — Pacte du grimoire (Pact of the Tome). Terminologie WotC FR
    // officielle (SRD FR p. 158 « Codex des Ombres ») : « sort mineur »
    // (= cantrip), « rituel » (= ritual). « N'importe quelle classe »
    // reprend la formulation SRD « from any class's spell list ».
    'wizard.subchoice.pactOfTheTome.cantripsLegend':
      'Codex des Ombres — sorts mineurs',
    'wizard.subchoice.pactOfTheTome.cantripsHelper':
      "Choisis {count} sorts mineurs de n'importe quelle classe. Préparés tant que le grimoire est sur toi.",
    'wizard.subchoice.pactOfTheTome.ritualsLegend':
      'Codex des Ombres — rituels du 1ᵉʳ niveau',
    'wizard.subchoice.pactOfTheTome.ritualsHelper':
      "Choisis {count} sorts du 1ᵉʳ niveau marqués « rituel » de n'importe quelle classe. Préparés tant que le grimoire est sur toi.",
    // D13c — Pacte de la lame (Pact of the Blade). Terminologie WotC FR
    // officielle (SRD FR p. 158) : « arme de pacte », « corps-à-corps simple »,
    // « corps-à-corps de guerre » (martial). Le chooser sélectionne UNE arme.
    'wizard.subchoice.pactOfTheBlade.legend': 'Arme de pacte',
    'wizard.subchoice.pactOfTheBlade.helper':
      'Choisis une arme corps-à-corps simple OU de guerre à pré-bonder. Tu pourras toujours la changer en jeu (action bonus, contact 1 minute).',
    'wizard.helpPanel.viewDetail': 'Voir le détail',
    'wizard.helpPanel.close': 'Fermer',
    // Spell detail panel
    'spell.level.cantrip': 'Sort mineur',
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
    'sheet.magie.ancestry.tieflingCommonSource': "Présence d’outre-monde",
    'sheet.magie.cantNotImplementedAncestry':
      "Lancement des sorts d'ascendance pas encore implémenté.",
    // D13e-followup-grant-display — nom de l'invocation `pact-of-the-tome`
    // (SRD FR : « Pacte du grimoire » — invocations.json > pact-of-the-tome.name.fr).
    'sheet.magie.pactTome.sourceLabel': 'Pacte du grimoire',
    // Plan D1 — modes de résolution des dégâts de sort (modale détail)
    'spell.damage.resolution.attack-roll': "Jet d'attaque",
    'spell.damage.resolution.saving-throw': 'Jet de sauvegarde',
    'spell.damage.resolution.auto': 'Touche automatique',
    // Manifestations occultes — D13a Armure d'ombres (terminologie WotC FR
    // standard : « Armure du mage » = Mage Armor, présent dans le bundle SRD
    // FR `public/data/spells.json` slug `armure-du-mage`).
    'sheet.essence.invocation.mechanicsTitle': 'Mécanique',
    'sheet.essence.invocation.armorOfShadows.label':
      'CA = 13 + modificateur de Dextérité',
    'sheet.essence.invocation.armorOfShadows.condition':
      "S'applique uniquement sans armure équipée. Le bouclier reste cumulable.",
    // D13b Éveil occulte (Eldritch Mind) — terminologie WotC FR : « Avantage »
    // + « Constitution » + « Concentration » figurent intacts dans le bundle
    // SRD FR (cf. `public/data/conditions.json` état Concentration).
    'sheet.essence.invocation.eldritchMind.label':
      'Avantage aux jets de Constitution pour la Concentration',
    'sheet.essence.invocation.eldritchMind.condition':
      "S'applique à chaque jet de sauvegarde de Constitution effectué pour maintenir la Concentration sur un sort.",
    // D13c Pacte de la lame — terminologie WotC FR : tous les termes
    // (« Action bonus », « arme de corps à corps simple ou de guerre »,
    // « Charisme », « nécrotiques/psychiques/radiants ») figurent dans le
    // bundle SRD FR (cf. `public/data/invocations.json > pact-of-the-blade
    // .summary.fr`).
    'sheet.essence.invocation.pactOfTheBlade.label':
      'Arme de pacte invoquée',
    'sheet.essence.invocation.pactOfTheBlade.action':
      "Action bonus pour invoquer ou rappeler l'arme de pacte.",
    'sheet.essence.invocation.pactOfTheBlade.weapon':
      'Arme de corps à corps simple ou de guerre, au choix au moment du lien.',
    'sheet.essence.invocation.pactOfTheBlade.attackAbility':
      'Vous pouvez utiliser votre modificateur de Charisme aux jets d’attaque et de dégâts.',
    'sheet.essence.invocation.pactOfTheBlade.damageTypes':
      'Type de dégâts au choix : nécrotiques, psychiques, radiants, ou le type normal de l’arme.',
    'sheet.essence.invocation.pactOfTheBlade.deferred':
      "Annoncez votre choix au MJ — l'intégration moteur de combat est différée à un plan ultérieur.",
    // D13d Pacte de la chaîne — terminologie WotC FR : « Appel de familier »
    // est le nom du sort dans le bundle SRD FR (`public/data/spells.json >
    // appel-de-familier`). « Démon mineur / Pseudodragon / Quasit / Sprite »
    // figurent intacts dans `pact-of-the-chain.summary.fr`.
    'sheet.essence.invocation.pactOfTheChain.label':
      'Appel de familier amélioré',
    'sheet.essence.invocation.pactOfTheChain.action':
      "Action magique pour lancer Appel de familier (le sort est appris gratuitement).",
    'sheet.essence.invocation.pactOfTheChain.noSlot':
      'Aucun emplacement de sort consommé à chaque incantation.',
    'sheet.essence.invocation.pactOfTheChain.specialForms':
      'Formes spéciales au choix : Diablotin, esprit follet, pseudodragon, quasit, sphinx merveilleux, serpent venimeux ou squelette (en plus des formes normales du sort).',
    'sheet.essence.invocation.pactOfTheChain.deferred':
      "Profils complets bundlés à ce jour : Pseudodragon, Quasit, Sphinx merveilleux, Esprit follet. Les autres formes (Diablotin, Squelette, Serpent venimeux) sont citées par le SRD mais leur profil n'est pas encore intégré — annoncez votre choix au MJ à l'incantation.",
    // D13e Pacte du grimoire — terminologie WotC FR : « sort mineur(s) »
    // (sort officiel pour cantrip — pas « tour de magie », cf. règle
    // d'autorité terminologique CLAUDE.md), « rituel »/« sort rituel »
    // dans le bundle SRD FR, « focaliseur d'incantation » (cf.
    // `public/data/items.json` — équipement d'incantation).
    'sheet.essence.invocation.pactOfTheTome.label': 'Codex des Ombres',
    'sheet.essence.invocation.pactOfTheTome.cantrips':
      "Apprenez 3 sorts mineurs au choix de n'importe quelle classe.",
    'sheet.essence.invocation.pactOfTheTome.rituals':
      "Apprenez 2 sorts du 1ᵉʳ niveau marqués « Rituel » au choix de n'importe quelle classe.",
    'sheet.essence.invocation.pactOfTheTome.focus':
      "Le grimoire sert de focaliseur d'incantation pour vos sorts d'Occultiste.",
    'sheet.essence.invocation.pactOfTheTome.deferred':
      "Choisissez vos 5 sorts avec votre MJ — l'intégration au moteur de sorts est différée à un plan ultérieur.",
    // Combat — badge Weapon Mastery (hotfix UAT 2026-05-19)
    'sheet.combat.attacks.masteryBadgePrefix': 'Maîtrise',
    'sheet.combat.attacks.masteryBadgeAria': 'Voir la maîtrise de {weapon}',
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
    // Connectivité — bannière offline (jalon 1D). Le SDK Firestore met les
    // écritures en file et les rejoue à la reconnexion, le cache Dexie
    // restitue les bundles publics, et le SW Workbox sert les assets.
    // L'utilisateur garde la lecture et l'édition locale.
    'connectivity.offline.title': 'Tu es hors ligne',
    'connectivity.offline.body':
      'La lecture reste disponible. Tes modifications seront synchronisées au retour de la connexion.',
    'connectivity.syncing.title': 'Synchronisation en cours…',
    'connectivity.syncing.body':
      'Tes modifications sont envoyées au serveur.',
    // Custom content — écran d'import (JALON 3B.4)
    'customContent.title': 'Contenu personnalisé',
    'customContent.subtitle':
      'Importe tes propres sorts, classes, ascendances et items — sans quitter l’app.',
    'customContent.dropzone.title': 'Ajouter un pack',
    'customContent.dropzone.body':
      'Glisse un fichier JSON ici, ou clique pour le sélectionner.',
    'customContent.dropzone.cta': 'Choisir un fichier',
    'customContent.preview.title': 'Aperçu du pack',
    'customContent.preview.metaAuthor': 'Auteur',
    'customContent.preview.metaVersion': 'Version',
    'customContent.preview.entities': 'Contenu',
    'customContent.preview.import': 'Importer',
    'customContent.preview.cancel': 'Annuler',
    'customContent.errors.title': 'Pack invalide',
    'customContent.errors.scope.root': 'Pack',
    'customContent.errors.scope.meta': 'Métadonnées',
    'customContent.errors.scope.entity': 'Entité',
    'customContent.errors.retry': 'Recommencer',
    'customContent.errors.parseJson':
      'Le fichier n’est pas du JSON valide. Vérifie sa syntaxe.',
    'customContent.list.title': 'Mes packs importés',
    'customContent.list.empty':
      'Aucun pack importé pour l’instant.',
    'customContent.list.delete': 'Supprimer',
    'customContent.list.deleteConfirm':
      'Supprimer définitivement ce pack ?',
    'customContent.toast.imported': 'Pack importé',
    'customContent.toast.importedSub': '{count} entrée·s ajoutée·s',
    'customContent.toast.deleted': 'Pack supprimé',
    'customContent.toast.error': 'Erreur d’import',
    'customContent.category.spells': 'Sorts',
    'customContent.category.classes': 'Classes',
    'customContent.category.subclasses': 'Sous-classes',
    'customContent.category.ancestries': 'Ascendances',
    'customContent.category.subancestries': 'Sous-ascendances',
    'customContent.category.backgrounds': 'Historiques',
    'customContent.category.feats': 'Dons',
    'customContent.category.invocations': 'Invocations',
    'customContent.category.items': 'Objets',
    // Pack editor — création in-app (JALON 3C.1)
    'customContent.createLink': 'Créer un pack sans fichier',
    'customContent.editor.title': 'Créer un pack',
    'customContent.editor.subtitle':
      'Compose ton pack catégorie par catégorie. Tu pourras l’éditer plus tard.',
    'customContent.editor.meta.title': 'Métadonnées du pack',
    'customContent.editor.meta.id': 'Identifiant',
    'customContent.editor.meta.idHelper':
      'En kebab-case (lettres minuscules, chiffres, tirets).',
    'customContent.editor.meta.nameFr': 'Nom (FR)',
    'customContent.editor.meta.nameEn': 'Nom (EN, optionnel)',
    'customContent.editor.meta.author': 'Auteur',
    'customContent.editor.meta.version': 'Version',
    'customContent.editor.meta.versionHelper':
      'Format semver MAJOR.MINOR.PATCH, par exemple 1.0.0.',
    'customContent.editor.meta.descriptionFr': 'Description (FR, optionnelle)',
    'customContent.editor.meta.descriptionEn': 'Description (EN, optionnelle)',
    'customContent.editor.meta.descriptionHelper':
      'Affichée à l’aperçu du pack après import.',
    'customContent.editor.entities.title': 'Contenu du pack',
    'customContent.editor.feats.add': 'Ajouter un don',
    'customContent.editor.feats.empty':
      'Aucun don ajouté pour l’instant.',
    'customContent.editor.feats.remove': 'Retirer',
    'customContent.editor.invocations.add': 'Ajouter une invocation',
    'customContent.editor.invocations.empty':
      'Aucune invocation ajoutée pour l’instant.',
    'customContent.editor.invocations.remove': 'Retirer',
    'customContent.editor.comingSoon.title': 'Autres catégories — bientôt',
    'customContent.editor.comingSoon.body':
      'Sorts, classes, ascendances, items et autres seront éditables in-app dans les prochaines mises à jour. Pour ces catégories, l’import par fichier reste disponible.',
    'customContent.editor.cancel': 'Annuler',
    'customContent.editor.save': 'Enregistrer le pack',
    'customContent.editor.save.successTitle': 'Pack enregistré',
    'customContent.editor.save.successSub':
      '{count} entrée·s prêtes à servir.',
    'customContent.editor.save.errorTitle': 'Pack invalide',
    'customContent.editor.save.errorGeneric':
      'Le pack n’est pas valide. Vérifie les champs requis.',
    'customContent.editor.featForm.title': 'Nouveau don',
    'customContent.editor.featForm.id': 'Identifiant du don',
    'customContent.editor.featForm.idHelper':
      'En kebab-case, unique dans le pack.',
    'customContent.editor.featForm.nameFr': 'Nom (FR)',
    'customContent.editor.featForm.nameEn': 'Nom (EN, optionnel)',
    'customContent.editor.featForm.summaryFr': 'Résumé (FR, optionnel)',
    'customContent.editor.featForm.summaryEn': 'Résumé (EN, optionnel)',
    'customContent.editor.featForm.summaryHelper':
      'Phrase courte affichée dans la liste des dons au level-up.',
    'customContent.editor.featForm.prerequisiteFr':
      'Prérequis affiché (FR, optionnel)',
    'customContent.editor.featForm.prerequisiteEn':
      'Prérequis affiché (EN, optionnel)',
    'customContent.editor.featForm.prerequisiteHelper':
      'Texte d’affichage. Les prérequis exécutables seront ajoutés plus tard.',
    'customContent.editor.featForm.cancel': 'Annuler',
    'customContent.editor.featForm.confirm': 'Confirmer le don',
    'customContent.editor.featForm.error.idRequired':
      'L’identifiant est requis.',
    'customContent.editor.featForm.error.idFormat':
      'L’identifiant doit être en kebab-case (lettres minuscules, chiffres, tirets).',
    'customContent.editor.featForm.error.nameFrRequired':
      'Le nom (FR) est requis.',
    'customContent.editor.invocationForm.title': 'Nouvelle invocation',
    'customContent.editor.invocationForm.id': 'Identifiant de l’invocation',
    'customContent.editor.invocationForm.idHelper':
      'En kebab-case, unique dans le pack.',
    'customContent.editor.invocationForm.nameFr': 'Nom (FR)',
    'customContent.editor.invocationForm.nameEn': 'Nom (EN, optionnel)',
    'customContent.editor.invocationForm.summaryFr': 'Résumé (FR)',
    'customContent.editor.invocationForm.summaryEn': 'Résumé (EN, optionnel)',
    'customContent.editor.invocationForm.summaryHelper':
      'Phrase courte affichée dans la liste des invocations.',
    'customContent.editor.invocationForm.hasLevelPrereq':
      'Niveau de Sorcier requis',
    'customContent.editor.invocationForm.hasLevelPrereqHelper':
      'Cochez pour limiter l’invocation à partir d’un certain niveau de Sorcier. Décochez pour la rendre utilisable dès le niveau 1.',
    'customContent.editor.invocationForm.warlockLevel':
      'Niveau de Sorcier minimum',
    'customContent.editor.invocationForm.prerequisiteOtherFr':
      'Autre prérequis (FR, optionnel)',
    'customContent.editor.invocationForm.prerequisiteOtherEn':
      'Autre prérequis (EN, optionnel)',
    'customContent.editor.invocationForm.prerequisiteOtherHelper':
      'Texte libre, par exemple « Pacte de la Lame ».',
    'customContent.editor.invocationForm.cancel': 'Annuler',
    'customContent.editor.invocationForm.confirm': 'Confirmer l’invocation',
    'customContent.editor.invocationForm.error.idRequired':
      'L’identifiant est requis.',
    'customContent.editor.invocationForm.error.idFormat':
      'L’identifiant doit être en kebab-case (lettres minuscules, chiffres, tirets).',
    'customContent.editor.invocationForm.error.nameFrRequired':
      'Le nom (FR) est requis.',
    'customContent.editor.invocationForm.error.summaryFrRequired':
      'Le résumé (FR) est requis.',
    'customContent.editor.invocationForm.error.levelRange':
      'Le niveau doit être compris entre 1 et 20.',
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
    'wizard.method.rolled': '4d6 (drop lowest)',
    'wizard.method.manual': 'Manual',
    'wizard.method.rolled.source.app': 'App rolls the dice',
    'wizard.method.rolled.source.manual': 'I roll my own dice (IRL)',
    'wizard.label.rollSource': 'Who rolls?',
    'wizard.label.rolledBreakdown': 'Roll breakdown',
    'wizard.action.rollAbilities': 'Roll 4d6 for all 6 abilities',
    'wizard.action.reroll': 'Reroll',
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
    'wizard.help.abilities.method.rolled':
      'For each ability: roll 4d6 and keep the highest 3. Scores range 3-18.',
    'wizard.help.abilities.method.manual': 'Free entry (DM trust mode).',
    'wizard.help.abilities.rolled.app':
      'The app rolls for you. Reroll if you do not like the result.',
    'wizard.help.abilities.rolled.manual':
      'Roll your own dice at the table, then enter the six totals here (3-18 each).',
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
    'wizard.subchoice.pending.expertiseAtClassStep':
      'Expertise is picked at the Skills step — its list depends on which skills you end up with.',
    'wizard.subchoice.pending.expertiseNoSkills':
      'Pick your class skills above first — Expertise will then choose from them.',
    // Class sub-choices (plan 13.9)
    'wizard.subchoice.class.section.title': 'Refine your class',
    'wizard.subchoice.class.section.helper':
      'A few more picks that shape your play style. You can revisit them on the sheet later.',
    'wizard.subchoice.divineOrder.legend': 'Divine Order',
    'wizard.subchoice.divineOrder.helper':
      'Two cleric paths: Protector (front-line with heavy armor and martial weapons) or Thaumaturge (scholar of the divine mysteries with an extra cantrip).',
    'wizard.subchoice.primalOrder.legend': 'Primal Order',
    'wizard.subchoice.primalOrder.helper':
      'Two druid paths: Magician (spell-focused with nature-Int bonus) or Warden (martial weapons + medium armor to physically defend the wild).',
    'wizard.subchoice.fightingStyle.legend': 'Fighting Style',
    'wizard.subchoice.fightingStyle.helper':
      'Your combat signature. Each style grants a distinct mechanical edge — pick what you want to see at the table.',
    'wizard.subchoice.weaponMastery.legend': 'Weapon Mastery',
    'wizard.subchoice.weaponMastery.helper':
      'Pick {count} weapon(s) you master a special property on (automatic effect each time you hit). Pair with your starting gear.',
    'wizard.subchoice.weaponMastery.remaining': '{n} left to choose',
    'wizard.subchoice.weaponMastery.propertyPrefix': 'Mastery',
    'wizard.subchoice.expertise.legend': 'Expertise',
    'wizard.subchoice.expertise.helper':
      'Pick 2 skills you are already proficient in — you add your proficiency bonus twice (×2). Pick your signatures.',
    'wizard.subchoice.expertise.remaining': '{n} left to choose',
    'wizard.subchoice.eldritchInvocation.legend': 'Eldritch Invocation',
    'wizard.subchoice.eldritchInvocation.helper':
      'Your bond with the patron takes shape. The three Pacts (Blade, Chain, Tome) unlock class-specific content.',
    'wizard.subchoice.extraLanguages.legend': 'Extra languages',
    'wizard.subchoice.extraLanguages.helper':
      'Pick {count} extra language(s) — useful for diplomacy, reading old scrolls, or understanding a dragon.',
    'wizard.subchoice.extraLanguages.remaining': '{n} left to choose',
    'wizard.subchoice.extraLanguages.tierStandard': 'Standard',
    'wizard.subchoice.extraLanguages.tierRare': 'Rare',
    'wizard.subchoice.wizardSpellbook.inscribedLegend':
      'Spellbook — inscribed spells',
    'wizard.subchoice.wizardSpellbook.inscribedHelper':
      'Your starting spellbook holds {count} level-1 spells. These are the spells you know — you will prepare a subset each morning.',
    'wizard.subchoice.wizardSpellbook.preparedLegend':
      'Spells prepared today',
    'wizard.subchoice.wizardSpellbook.preparedHelper':
      'Pick {count} spells from your spellbook — only prepared spells are castable today. The others stay inscribed but unusable until prepared.',
    'wizard.subchoice.wizardSpellbook.preparedEmpty':
      'Inscribe spells in your spellbook above first.',
    // D13e — Pact of the Tome (Warlock).
    'wizard.subchoice.pactOfTheTome.cantripsLegend':
      'Book of Shadows — cantrips',
    'wizard.subchoice.pactOfTheTome.cantripsHelper':
      'Choose {count} cantrips from any class. Prepared while the book is on your person.',
    'wizard.subchoice.pactOfTheTome.ritualsLegend':
      'Book of Shadows — level-1 rituals',
    'wizard.subchoice.pactOfTheTome.ritualsHelper':
      'Choose {count} level-1 spells with the Ritual tag from any class. Prepared while the book is on your person.',
    // D13c — Pact of the Blade (Warlock).
    'wizard.subchoice.pactOfTheBlade.legend': 'Pact weapon',
    'wizard.subchoice.pactOfTheBlade.helper':
      'Choose one Simple or Martial Melee weapon to pre-bond. You can swap it in play (bonus action, 1-minute touch).',
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
    'sheet.magie.ancestry.tieflingCommonSource': 'Otherworldly Presence',
    'sheet.magie.cantNotImplementedAncestry':
      'Casting ancestry spells is not yet implemented.',
    'sheet.magie.pactTome.sourceLabel': 'Pact of the Tome',
    'spell.damage.resolution.attack-roll': 'Attack roll',
    'spell.damage.resolution.saving-throw': 'Saving throw',
    'spell.damage.resolution.auto': 'Automatic hit',
    'sheet.essence.invocation.mechanicsTitle': 'Mechanics',
    'sheet.essence.invocation.armorOfShadows.label':
      'AC = 13 + Dexterity modifier',
    'sheet.essence.invocation.armorOfShadows.condition':
      'Applies only while not wearing armor. Shields still stack.',
    'sheet.essence.invocation.eldritchMind.label':
      'Advantage on Constitution saves to maintain Concentration',
    'sheet.essence.invocation.eldritchMind.condition':
      'Applies to every Constitution saving throw rolled to maintain Concentration on a spell.',
    'sheet.essence.invocation.pactOfTheBlade.label': 'Conjured pact weapon',
    'sheet.essence.invocation.pactOfTheBlade.action':
      'Bonus Action to conjure or recall the pact weapon.',
    'sheet.essence.invocation.pactOfTheBlade.weapon':
      'Simple or Martial Melee weapon, chosen at the moment of bonding.',
    'sheet.essence.invocation.pactOfTheBlade.attackAbility':
      'You can use your Charisma modifier for the attack and damage rolls.',
    'sheet.essence.invocation.pactOfTheBlade.damageTypes':
      'Damage type at choice: Necrotic, Psychic, Radiant, or the weapon’s normal type.',
    'sheet.essence.invocation.pactOfTheBlade.deferred':
      'Announce your choice to the GM — combat-engine integration is deferred to a later plan.',
    'sheet.essence.invocation.pactOfTheChain.label': 'Enhanced Find Familiar',
    'sheet.essence.invocation.pactOfTheChain.action':
      'Magic action to cast Find Familiar (the spell is learned for free).',
    'sheet.essence.invocation.pactOfTheChain.noSlot':
      'No spell slot consumed when casting it this way.',
    'sheet.essence.invocation.pactOfTheChain.specialForms':
      'Special forms at choice: Imp, Pseudodragon, Quasit, Skeleton, Sphinx of Wonder, Sprite, or Venomous Snake (in addition to the normal forms of the spell).',
    'sheet.essence.invocation.pactOfTheChain.deferred':
      'Full stat blocks bundled to date: Pseudodragon, Quasit, Sphinx of Wonder, Sprite. The other forms (Imp, Skeleton, Venomous Snake) are cited by the SRD but their stat block is not bundled yet — announce your choice to the GM at casting.',
    'sheet.essence.invocation.pactOfTheTome.label': 'Book of Shadows',
    'sheet.essence.invocation.pactOfTheTome.cantrips':
      'Learn 3 cantrips of your choice from any class.',
    'sheet.essence.invocation.pactOfTheTome.rituals':
      'Learn 2 level-1 spells with the Ritual tag from any class.',
    'sheet.essence.invocation.pactOfTheTome.focus':
      'The book serves as a Spellcasting Focus for your Warlock spells.',
    'sheet.essence.invocation.pactOfTheTome.deferred':
      'Choose your 5 spells with your GM — spell-engine integration is deferred to a later plan.',
    'sheet.combat.attacks.masteryBadgePrefix': 'Mastery',
    'sheet.combat.attacks.masteryBadgeAria': 'View {weapon} mastery',
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
    'connectivity.offline.title': 'You are offline',
    'connectivity.offline.body':
      'Reading still works. Your changes will sync when you reconnect.',
    'connectivity.syncing.title': 'Syncing…',
    'connectivity.syncing.body': 'Your changes are being sent to the server.',
    'customContent.title': 'Custom content',
    'customContent.subtitle':
      'Import your own spells, classes, ancestries and items — without leaving the app.',
    'customContent.dropzone.title': 'Add a pack',
    'customContent.dropzone.body': 'Drop a JSON file here, or click to pick one.',
    'customContent.dropzone.cta': 'Pick a file',
    'customContent.preview.title': 'Pack preview',
    'customContent.preview.metaAuthor': 'Author',
    'customContent.preview.metaVersion': 'Version',
    'customContent.preview.entities': 'Contents',
    'customContent.preview.import': 'Import',
    'customContent.preview.cancel': 'Cancel',
    'customContent.errors.title': 'Invalid pack',
    'customContent.errors.scope.root': 'Pack',
    'customContent.errors.scope.meta': 'Metadata',
    'customContent.errors.scope.entity': 'Entity',
    'customContent.errors.retry': 'Restart',
    'customContent.errors.parseJson':
      'The file is not valid JSON. Check its syntax.',
    'customContent.list.title': 'My imported packs',
    'customContent.list.empty': 'No packs imported yet.',
    'customContent.list.delete': 'Delete',
    'customContent.list.deleteConfirm': 'Permanently delete this pack?',
    'customContent.toast.imported': 'Pack imported',
    'customContent.toast.importedSub': '{count} entries added',
    'customContent.toast.deleted': 'Pack deleted',
    'customContent.toast.error': 'Import error',
    'customContent.category.spells': 'Spells',
    'customContent.category.classes': 'Classes',
    'customContent.category.subclasses': 'Subclasses',
    'customContent.category.ancestries': 'Ancestries',
    'customContent.category.subancestries': 'Subancestries',
    'customContent.category.backgrounds': 'Backgrounds',
    'customContent.category.feats': 'Feats',
    'customContent.category.invocations': 'Invocations',
    'customContent.category.items': 'Items',
    // Pack editor — in-app authoring (JALON 3C.1)
    'customContent.createLink': 'Author a pack without a file',
    'customContent.editor.title': 'Author a pack',
    'customContent.editor.subtitle':
      'Compose your pack category by category. You can edit it later.',
    'customContent.editor.meta.title': 'Pack metadata',
    'customContent.editor.meta.id': 'Identifier',
    'customContent.editor.meta.idHelper':
      'kebab-case (lowercase letters, digits, dashes).',
    'customContent.editor.meta.nameFr': 'Name (FR)',
    'customContent.editor.meta.nameEn': 'Name (EN, optional)',
    'customContent.editor.meta.author': 'Author',
    'customContent.editor.meta.version': 'Version',
    'customContent.editor.meta.versionHelper':
      'semver format MAJOR.MINOR.PATCH, e.g. 1.0.0.',
    'customContent.editor.meta.descriptionFr': 'Description (FR, optional)',
    'customContent.editor.meta.descriptionEn': 'Description (EN, optional)',
    'customContent.editor.meta.descriptionHelper':
      'Shown on the pack preview after import.',
    'customContent.editor.entities.title': 'Pack contents',
    'customContent.editor.feats.add': 'Add a feat',
    'customContent.editor.feats.empty': 'No feats added yet.',
    'customContent.editor.feats.remove': 'Remove',
    'customContent.editor.invocations.add': 'Add an invocation',
    'customContent.editor.invocations.empty': 'No invocations added yet.',
    'customContent.editor.invocations.remove': 'Remove',
    'customContent.editor.comingSoon.title': 'Other categories — coming soon',
    'customContent.editor.comingSoon.body':
      'Spells, classes, ancestries, items and more will be authorable in-app in upcoming releases. File import remains available for these categories.',
    'customContent.editor.cancel': 'Cancel',
    'customContent.editor.save': 'Save pack',
    'customContent.editor.save.successTitle': 'Pack saved',
    'customContent.editor.save.successSub': '{count} entries ready to use.',
    'customContent.editor.save.errorTitle': 'Invalid pack',
    'customContent.editor.save.errorGeneric':
      'The pack is not valid. Check the required fields.',
    'customContent.editor.featForm.title': 'New feat',
    'customContent.editor.featForm.id': 'Feat identifier',
    'customContent.editor.featForm.idHelper':
      'kebab-case, unique within the pack.',
    'customContent.editor.featForm.nameFr': 'Name (FR)',
    'customContent.editor.featForm.nameEn': 'Name (EN, optional)',
    'customContent.editor.featForm.summaryFr': 'Summary (FR, optional)',
    'customContent.editor.featForm.summaryEn': 'Summary (EN, optional)',
    'customContent.editor.featForm.summaryHelper':
      'Short sentence shown in the feat list at level-up.',
    'customContent.editor.featForm.prerequisiteFr':
      'Displayed prerequisite (FR, optional)',
    'customContent.editor.featForm.prerequisiteEn':
      'Displayed prerequisite (EN, optional)',
    'customContent.editor.featForm.prerequisiteHelper':
      'Display text. Executable prerequisites will be added later.',
    'customContent.editor.featForm.cancel': 'Cancel',
    'customContent.editor.featForm.confirm': 'Confirm feat',
    'customContent.editor.featForm.error.idRequired': 'Identifier is required.',
    'customContent.editor.featForm.error.idFormat':
      'Identifier must be kebab-case (lowercase letters, digits, dashes).',
    'customContent.editor.featForm.error.nameFrRequired': 'Name (FR) is required.',
    'customContent.editor.invocationForm.title': 'New invocation',
    'customContent.editor.invocationForm.id': 'Invocation identifier',
    'customContent.editor.invocationForm.idHelper':
      'kebab-case, unique within the pack.',
    'customContent.editor.invocationForm.nameFr': 'Name (FR)',
    'customContent.editor.invocationForm.nameEn': 'Name (EN, optional)',
    'customContent.editor.invocationForm.summaryFr': 'Summary (FR)',
    'customContent.editor.invocationForm.summaryEn': 'Summary (EN, optional)',
    'customContent.editor.invocationForm.summaryHelper':
      'Short sentence shown in the invocation list.',
    'customContent.editor.invocationForm.hasLevelPrereq':
      'Warlock level required',
    'customContent.editor.invocationForm.hasLevelPrereqHelper':
      'Tick to gate the invocation behind a minimum Warlock level. Untick to make it available from level 1.',
    'customContent.editor.invocationForm.warlockLevel':
      'Minimum Warlock level',
    'customContent.editor.invocationForm.prerequisiteOtherFr':
      'Other prerequisite (FR, optional)',
    'customContent.editor.invocationForm.prerequisiteOtherEn':
      'Other prerequisite (EN, optional)',
    'customContent.editor.invocationForm.prerequisiteOtherHelper':
      'Free text, e.g. "Pact of the Blade".',
    'customContent.editor.invocationForm.cancel': 'Cancel',
    'customContent.editor.invocationForm.confirm': 'Confirm invocation',
    'customContent.editor.invocationForm.error.idRequired':
      'Identifier is required.',
    'customContent.editor.invocationForm.error.idFormat':
      'Identifier must be kebab-case (lowercase letters, digits, dashes).',
    'customContent.editor.invocationForm.error.nameFrRequired':
      'Name (FR) is required.',
    'customContent.editor.invocationForm.error.summaryFrRequired':
      'Summary (FR) is required.',
    'customContent.editor.invocationForm.error.levelRange':
      'Level must be between 1 and 20.',
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
