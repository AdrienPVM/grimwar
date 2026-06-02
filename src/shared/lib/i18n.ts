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
  // Types de dégâts (canoniques SRD 5.2.1)
  | 'damageType.acid'
  | 'damageType.bludgeoning'
  | 'damageType.cold'
  | 'damageType.fire'
  | 'damageType.force'
  | 'damageType.lightning'
  | 'damageType.necrotic'
  | 'damageType.piercing'
  | 'damageType.poison'
  | 'damageType.psychic'
  | 'damageType.radiant'
  | 'damageType.slashing'
  | 'damageType.thunder'
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
  | 'customContent.editor.subancestries.add'
  | 'customContent.editor.subancestries.empty'
  | 'customContent.editor.subancestries.remove'
  | 'customContent.editor.backgrounds.add'
  | 'customContent.editor.backgrounds.empty'
  | 'customContent.editor.backgrounds.remove'
  | 'customContent.editor.subclasses.add'
  | 'customContent.editor.subclasses.empty'
  | 'customContent.editor.subclasses.remove'
  | 'customContent.editor.spells.add'
  | 'customContent.editor.spells.empty'
  | 'customContent.editor.spells.remove'
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
  | 'customContent.editor.invocationForm.error.levelRange'
  | 'customContent.editor.subancestryForm.title'
  | 'customContent.editor.subancestryForm.id'
  | 'customContent.editor.subancestryForm.idHelper'
  | 'customContent.editor.subancestryForm.ancestryId'
  | 'customContent.editor.subancestryForm.ancestryIdHelper'
  | 'customContent.editor.subancestryForm.ancestryIdPlaceholder'
  | 'customContent.editor.subancestryForm.ancestryIdLoading'
  | 'customContent.editor.subancestryForm.nameFr'
  | 'customContent.editor.subancestryForm.nameEn'
  | 'customContent.editor.subancestryForm.descriptionFr'
  | 'customContent.editor.subancestryForm.descriptionEn'
  | 'customContent.editor.subancestryForm.asisLegend'
  | 'customContent.editor.subancestryForm.asisHelper'
  | 'customContent.editor.subancestryForm.asisEmpty'
  | 'customContent.editor.subancestryForm.asiAdd'
  | 'customContent.editor.subancestryForm.asiAbility'
  | 'customContent.editor.subancestryForm.asiAbilityPlaceholder'
  | 'customContent.editor.subancestryForm.asiBonus'
  | 'customContent.editor.subancestryForm.traitsLegend'
  | 'customContent.editor.subancestryForm.traitsHelper'
  | 'customContent.editor.subancestryForm.traitsEmpty'
  | 'customContent.editor.subancestryForm.traitAdd'
  | 'customContent.editor.subancestryForm.traitNameFr'
  | 'customContent.editor.subancestryForm.traitNameEn'
  | 'customContent.editor.subancestryForm.traitDescriptionFr'
  | 'customContent.editor.subancestryForm.traitDescriptionEn'
  | 'customContent.editor.subancestryForm.removeRow'
  | 'customContent.editor.subancestryForm.cancel'
  | 'customContent.editor.subancestryForm.confirm'
  | 'customContent.editor.subancestryForm.error.idRequired'
  | 'customContent.editor.subancestryForm.error.idFormat'
  | 'customContent.editor.subancestryForm.error.ancestryIdRequired'
  | 'customContent.editor.subancestryForm.error.nameFrRequired'
  | 'customContent.editor.subancestryForm.error.descriptionFrRequired'
  | 'customContent.editor.subancestryForm.error.asiAbilityRequired'
  | 'customContent.editor.subancestryForm.error.asiDuplicate'
  | 'customContent.editor.subancestryForm.error.traitIncomplete'
  | 'customContent.editor.backgroundForm.title'
  | 'customContent.editor.backgroundForm.id'
  | 'customContent.editor.backgroundForm.idHelper'
  | 'customContent.editor.backgroundForm.nameFr'
  | 'customContent.editor.backgroundForm.nameEn'
  | 'customContent.editor.backgroundForm.descriptionFr'
  | 'customContent.editor.backgroundForm.descriptionEn'
  | 'customContent.editor.backgroundForm.skillsLegend'
  | 'customContent.editor.backgroundForm.skillsHelper'
  | 'customContent.editor.backgroundForm.toolsLegend'
  | 'customContent.editor.backgroundForm.toolsHelper'
  | 'customContent.editor.backgroundForm.toolsEmpty'
  | 'customContent.editor.backgroundForm.toolAdd'
  | 'customContent.editor.backgroundForm.toolAddPlaceholder'
  | 'customContent.editor.backgroundForm.toolAddButton'
  | 'customContent.editor.backgroundForm.languages'
  | 'customContent.editor.backgroundForm.languagesHelper'
  | 'customContent.editor.backgroundForm.equipmentLegend'
  | 'customContent.editor.backgroundForm.equipmentHelper'
  | 'customContent.editor.backgroundForm.equipmentEmpty'
  | 'customContent.editor.backgroundForm.equipmentAdd'
  | 'customContent.editor.backgroundForm.equipmentItemId'
  | 'customContent.editor.backgroundForm.equipmentItemIdPlaceholder'
  | 'customContent.editor.backgroundForm.equipmentItemIdLoading'
  | 'customContent.editor.backgroundForm.equipmentQty'
  | 'customContent.editor.backgroundForm.coinsLegend'
  | 'customContent.editor.backgroundForm.coinsToggle'
  | 'customContent.editor.backgroundForm.coinsQty'
  | 'customContent.editor.backgroundForm.coinsUnit'
  | 'customContent.editor.backgroundForm.coinUnit.cp'
  | 'customContent.editor.backgroundForm.coinUnit.sp'
  | 'customContent.editor.backgroundForm.coinUnit.ep'
  | 'customContent.editor.backgroundForm.coinUnit.gp'
  | 'customContent.editor.backgroundForm.coinUnit.pp'
  | 'customContent.editor.backgroundForm.featureLegend'
  | 'customContent.editor.backgroundForm.featureHelper'
  | 'customContent.editor.backgroundForm.featureNameFr'
  | 'customContent.editor.backgroundForm.featureNameEn'
  | 'customContent.editor.backgroundForm.featureDescriptionFr'
  | 'customContent.editor.backgroundForm.featureDescriptionEn'
  | 'customContent.editor.backgroundForm.removeRow'
  | 'customContent.editor.backgroundForm.cancel'
  | 'customContent.editor.backgroundForm.confirm'
  | 'customContent.editor.backgroundForm.error.idRequired'
  | 'customContent.editor.backgroundForm.error.idFormat'
  | 'customContent.editor.backgroundForm.error.nameFrRequired'
  | 'customContent.editor.backgroundForm.error.descriptionFrRequired'
  | 'customContent.editor.backgroundForm.error.featureNameFrRequired'
  | 'customContent.editor.backgroundForm.error.featureDescriptionFrRequired'
  | 'customContent.editor.backgroundForm.error.equipmentItemIdRequired'
  | 'customContent.editor.backgroundForm.error.equipmentDuplicate'
  | 'customContent.editor.backgroundForm.error.equipmentQtyInvalid'
  | 'customContent.editor.subclassForm.title'
  | 'customContent.editor.subclassForm.id'
  | 'customContent.editor.subclassForm.idHelper'
  | 'customContent.editor.subclassForm.classId'
  | 'customContent.editor.subclassForm.classIdHelper'
  | 'customContent.editor.subclassForm.classIdPlaceholder'
  | 'customContent.editor.subclassForm.classIdLoading'
  | 'customContent.editor.subclassForm.nameFr'
  | 'customContent.editor.subclassForm.nameEn'
  | 'customContent.editor.subclassForm.descriptionFr'
  | 'customContent.editor.subclassForm.descriptionEn'
  | 'customContent.editor.subclassForm.featuresLegend'
  | 'customContent.editor.subclassForm.featuresHelper'
  | 'customContent.editor.subclassForm.featuresEmpty'
  | 'customContent.editor.subclassForm.featureAdd'
  | 'customContent.editor.subclassForm.featureLevel'
  | 'customContent.editor.subclassForm.featureNameFr'
  | 'customContent.editor.subclassForm.featureNameEn'
  | 'customContent.editor.subclassForm.featureDescriptionFr'
  | 'customContent.editor.subclassForm.featureDescriptionEn'
  | 'customContent.editor.subclassForm.removeRow'
  | 'customContent.editor.subclassForm.cancel'
  | 'customContent.editor.subclassForm.confirm'
  | 'customContent.editor.subclassForm.error.idRequired'
  | 'customContent.editor.subclassForm.error.idFormat'
  | 'customContent.editor.subclassForm.error.classIdRequired'
  | 'customContent.editor.subclassForm.error.nameFrRequired'
  | 'customContent.editor.subclassForm.error.descriptionFrRequired'
  | 'customContent.editor.subclassForm.error.featureIncomplete'
  | 'customContent.editor.subclassForm.error.featureDuplicate'
  | 'customContent.editor.spellForm.title'
  | 'customContent.editor.spellForm.id'
  | 'customContent.editor.spellForm.idHelper'
  | 'customContent.editor.spellForm.nameFr'
  | 'customContent.editor.spellForm.nameEn'
  | 'customContent.editor.spellForm.level'
  | 'customContent.editor.spellForm.levelHelper'
  | 'customContent.editor.spellForm.school'
  | 'customContent.editor.spellForm.schoolPlaceholder'
  | 'customContent.editor.spellForm.castingTimeFr'
  | 'customContent.editor.spellForm.castingTimeEn'
  | 'customContent.editor.spellForm.castingTimeHelper'
  | 'customContent.editor.spellForm.rangeFr'
  | 'customContent.editor.spellForm.rangeEn'
  | 'customContent.editor.spellForm.rangeHelper'
  | 'customContent.editor.spellForm.durationFr'
  | 'customContent.editor.spellForm.durationEn'
  | 'customContent.editor.spellForm.durationHelper'
  | 'customContent.editor.spellForm.componentsLegend'
  | 'customContent.editor.spellForm.componentsHelper'
  | 'customContent.editor.spellForm.componentV'
  | 'customContent.editor.spellForm.componentS'
  | 'customContent.editor.spellForm.componentM'
  | 'customContent.editor.spellForm.materialFr'
  | 'customContent.editor.spellForm.materialEn'
  | 'customContent.editor.spellForm.materialHelper'
  | 'customContent.editor.spellForm.concentration'
  | 'customContent.editor.spellForm.concentrationHelper'
  | 'customContent.editor.spellForm.ritual'
  | 'customContent.editor.spellForm.ritualHelper'
  | 'customContent.editor.spellForm.descriptionFr'
  | 'customContent.editor.spellForm.descriptionEn'
  | 'customContent.editor.spellForm.descriptionHelper'
  | 'customContent.editor.spellForm.hasAtHigherLevels'
  | 'customContent.editor.spellForm.hasAtHigherLevelsHelper'
  | 'customContent.editor.spellForm.atHigherLevelsFr'
  | 'customContent.editor.spellForm.atHigherLevelsEn'
  | 'customContent.editor.spellForm.classesLegend'
  | 'customContent.editor.spellForm.classesHelper'
  | 'customContent.editor.spellForm.classesLoading'
  | 'customContent.editor.spellForm.classesEmpty'
  | 'customContent.editor.spellForm.damageLegend'
  | 'customContent.editor.spellForm.damageHelper'
  | 'customContent.editor.spellForm.damageEmpty'
  | 'customContent.editor.spellForm.damageAdd'
  | 'customContent.editor.spellForm.damageFormula'
  | 'customContent.editor.spellForm.damageFormulaPlaceholder'
  | 'customContent.editor.spellForm.damageType'
  | 'customContent.editor.spellForm.damageTypeLabelFr'
  | 'customContent.editor.spellForm.damageTypeLabelEn'
  | 'customContent.editor.spellForm.damageHasUpcast'
  | 'customContent.editor.spellForm.damageHasUpcastHelper'
  | 'customContent.editor.spellForm.damageUpcastPerLevel'
  | 'customContent.editor.spellForm.damageUpcastPerLevelHelper'
  | 'customContent.editor.spellForm.damageUpcastPerLevelPlaceholder'
  | 'customContent.editor.spellForm.removeRow'
  | 'customContent.editor.spellForm.cancel'
  | 'customContent.editor.spellForm.confirm'
  | 'customContent.editor.spellForm.error.idRequired'
  | 'customContent.editor.spellForm.error.idFormat'
  | 'customContent.editor.spellForm.error.nameFrRequired'
  | 'customContent.editor.spellForm.error.schoolRequired'
  | 'customContent.editor.spellForm.error.castingTimeFrRequired'
  | 'customContent.editor.spellForm.error.rangeFrRequired'
  | 'customContent.editor.spellForm.error.durationFrRequired'
  | 'customContent.editor.spellForm.error.descriptionFrRequired'
  | 'customContent.editor.spellForm.error.materialFrRequired'
  | 'customContent.editor.spellForm.error.atHigherLevelsFrRequired'
  | 'customContent.editor.spellForm.error.damageIncomplete'
  | 'customContent.editor.spellForm.error.damageDuplicate'
  | 'customContent.editor.items.add'
  | 'customContent.editor.items.empty'
  | 'customContent.editor.items.remove'
  | 'customContent.editor.itemForm.title'
  | 'customContent.editor.itemForm.id'
  | 'customContent.editor.itemForm.idHelper'
  | 'customContent.editor.itemForm.nameFr'
  | 'customContent.editor.itemForm.nameEn'
  | 'customContent.editor.itemForm.category'
  | 'customContent.editor.itemForm.categoryPlaceholder'
  | 'customContent.editor.itemForm.hasCost'
  | 'customContent.editor.itemForm.hasCostHelper'
  | 'customContent.editor.itemForm.costQty'
  | 'customContent.editor.itemForm.costUnit'
  | 'customContent.editor.itemForm.costUnitPlaceholder'
  | 'customContent.editor.itemForm.weight'
  | 'customContent.editor.itemForm.weightHelper'
  | 'customContent.editor.itemForm.hasDescription'
  | 'customContent.editor.itemForm.hasDescriptionHelper'
  | 'customContent.editor.itemForm.descriptionFr'
  | 'customContent.editor.itemForm.descriptionEn'
  | 'customContent.editor.itemForm.descriptionHelper'
  | 'customContent.editor.itemForm.weaponLegend'
  | 'customContent.editor.itemForm.weaponHelper'
  | 'customContent.editor.itemForm.hasDamage'
  | 'customContent.editor.itemForm.hasDamageHelper'
  | 'customContent.editor.itemForm.damageDice'
  | 'customContent.editor.itemForm.damageDicePlaceholder'
  | 'customContent.editor.itemForm.damageType'
  | 'customContent.editor.itemForm.damageTypeLabelFr'
  | 'customContent.editor.itemForm.damageTypeLabelEn'
  | 'customContent.editor.itemForm.hasRange'
  | 'customContent.editor.itemForm.hasRangeHelper'
  | 'customContent.editor.itemForm.rangeNormal'
  | 'customContent.editor.itemForm.rangeMax'
  | 'customContent.editor.itemForm.rangeHelper'
  | 'customContent.editor.itemForm.hasMastery'
  | 'customContent.editor.itemForm.hasMasteryHelper'
  | 'customContent.editor.itemForm.masteryProperty'
  | 'customContent.editor.itemForm.masteryPlaceholder'
  | 'customContent.editor.itemForm.propertiesLegend'
  | 'customContent.editor.itemForm.propertiesHelper'
  | 'customContent.editor.itemForm.propertyAdd'
  | 'customContent.editor.itemForm.propertyPlaceholder'
  | 'customContent.editor.itemForm.propertyEmpty'
  | 'customContent.editor.itemForm.armorLegend'
  | 'customContent.editor.itemForm.armorHelper'
  | 'customContent.editor.itemForm.acBase'
  | 'customContent.editor.itemForm.acBaseHelper'
  | 'customContent.editor.itemForm.hasAcDexMax'
  | 'customContent.editor.itemForm.hasAcDexMaxHelper'
  | 'customContent.editor.itemForm.acDexMax'
  | 'customContent.editor.itemForm.acDexMaxHelper'
  | 'customContent.editor.itemForm.hasStrRequired'
  | 'customContent.editor.itemForm.hasStrRequiredHelper'
  | 'customContent.editor.itemForm.strRequired'
  | 'customContent.editor.itemForm.stealthDisadvantage'
  | 'customContent.editor.itemForm.stealthDisadvantageHelper'
  | 'customContent.editor.itemForm.removeRow'
  | 'customContent.editor.itemForm.cancel'
  | 'customContent.editor.itemForm.confirm'
  | 'customContent.editor.itemForm.error.idRequired'
  | 'customContent.editor.itemForm.error.idFormat'
  | 'customContent.editor.itemForm.error.nameFrRequired'
  | 'customContent.editor.itemForm.error.categoryRequired'
  | 'customContent.editor.itemForm.error.weightNegative'
  | 'customContent.editor.itemForm.error.costQtyNegative'
  | 'customContent.editor.itemForm.error.descriptionFrRequired'
  | 'customContent.editor.itemForm.error.damageDiceRequired'
  | 'customContent.editor.itemForm.error.damageTypeLabelFrRequired'
  | 'customContent.editor.itemForm.error.rangeNormalRequired'
  | 'customContent.editor.itemForm.error.rangeMaxLessThanNormal'
  | 'customContent.editor.itemForm.error.acBaseRequired'
  | 'customContent.editor.itemForm.error.strRequiredRequired'
  | 'customContent.editor.itemForm.error.propertyDuplicate'
  | 'customContent.editor.itemForm.error.propertyEmpty'
  | 'customContent.editor.ancestries.add'
  | 'customContent.editor.ancestries.empty'
  | 'customContent.editor.ancestries.remove'
  | 'customContent.editor.ancestryForm.title'
  | 'customContent.editor.ancestryForm.id'
  | 'customContent.editor.ancestryForm.idHelper'
  | 'customContent.editor.ancestryForm.nameFr'
  | 'customContent.editor.ancestryForm.nameEn'
  | 'customContent.editor.ancestryForm.size'
  | 'customContent.editor.ancestryForm.speed'
  | 'customContent.editor.ancestryForm.speedHelper'
  | 'customContent.editor.ancestryForm.descriptionFr'
  | 'customContent.editor.ancestryForm.descriptionEn'
  | 'customContent.editor.ancestryForm.asisLegend'
  | 'customContent.editor.ancestryForm.asisHelper'
  | 'customContent.editor.ancestryForm.asisEmpty'
  | 'customContent.editor.ancestryForm.asiAbility'
  | 'customContent.editor.ancestryForm.asiAbilityPlaceholder'
  | 'customContent.editor.ancestryForm.asiBonus'
  | 'customContent.editor.ancestryForm.asiAdd'
  | 'customContent.editor.ancestryForm.traitsLegend'
  | 'customContent.editor.ancestryForm.traitsHelper'
  | 'customContent.editor.ancestryForm.traitsEmpty'
  | 'customContent.editor.ancestryForm.traitNameFr'
  | 'customContent.editor.ancestryForm.traitNameEn'
  | 'customContent.editor.ancestryForm.traitDescriptionFr'
  | 'customContent.editor.ancestryForm.traitDescriptionEn'
  | 'customContent.editor.ancestryForm.traitAdd'
  | 'customContent.editor.ancestryForm.languagesLegend'
  | 'customContent.editor.ancestryForm.languagesHelper'
  | 'customContent.editor.ancestryForm.languagesEmpty'
  | 'customContent.editor.ancestryForm.languageAdd'
  | 'customContent.editor.ancestryForm.languageAddPlaceholder'
  | 'customContent.editor.ancestryForm.languageAddButton'
  | 'customContent.editor.ancestryForm.commonSpellsLegend'
  | 'customContent.editor.ancestryForm.commonSpellsHelper'
  | 'customContent.editor.ancestryForm.commonSpellsLoading'
  | 'customContent.editor.ancestryForm.commonSpellsEmpty'
  | 'customContent.editor.ancestryForm.dragonLegend'
  | 'customContent.editor.ancestryForm.dragonHelper'
  | 'customContent.editor.ancestryForm.dragonEmpty'
  | 'customContent.editor.ancestryForm.dragonAdd'
  | 'customContent.editor.ancestryForm.dragonOptionId'
  | 'customContent.editor.ancestryForm.dragonOptionIdPlaceholder'
  | 'customContent.editor.ancestryForm.dragonOptionNameFr'
  | 'customContent.editor.ancestryForm.dragonOptionNameEn'
  | 'customContent.editor.ancestryForm.dragonOptionDamageType'
  | 'customContent.editor.ancestryForm.dragonOptionDamageLabelFr'
  | 'customContent.editor.ancestryForm.dragonOptionDamageLabelEn'
  | 'customContent.editor.ancestryForm.giantLegend'
  | 'customContent.editor.ancestryForm.giantHelper'
  | 'customContent.editor.ancestryForm.giantEmpty'
  | 'customContent.editor.ancestryForm.giantAdd'
  | 'customContent.editor.ancestryForm.giantOptionId'
  | 'customContent.editor.ancestryForm.giantOptionIdPlaceholder'
  | 'customContent.editor.ancestryForm.giantOptionNameFr'
  | 'customContent.editor.ancestryForm.giantOptionNameEn'
  | 'customContent.editor.ancestryForm.giantOptionEffectFr'
  | 'customContent.editor.ancestryForm.giantOptionEffectEn'
  | 'customContent.editor.ancestryForm.removeRow'
  | 'customContent.editor.ancestryForm.cancel'
  | 'customContent.editor.ancestryForm.confirm'
  | 'customContent.editor.ancestryForm.error.idRequired'
  | 'customContent.editor.ancestryForm.error.idFormat'
  | 'customContent.editor.ancestryForm.error.idReserved'
  | 'customContent.editor.ancestryForm.error.nameFrRequired'
  | 'customContent.editor.ancestryForm.error.descriptionFrRequired'
  | 'customContent.editor.ancestryForm.error.speedPositive'
  | 'customContent.editor.ancestryForm.error.asiAbilityRequired'
  | 'customContent.editor.ancestryForm.error.asiDuplicate'
  | 'customContent.editor.ancestryForm.error.traitIncomplete'
  | 'customContent.editor.ancestryForm.error.dragonIncomplete'
  | 'customContent.editor.ancestryForm.error.dragonIdFormat'
  | 'customContent.editor.ancestryForm.error.dragonDuplicate'
  | 'customContent.editor.ancestryForm.error.giantIncomplete'
  | 'customContent.editor.ancestryForm.error.giantIdFormat'
  | 'customContent.editor.ancestryForm.error.giantDuplicate'
  | 'customContent.editor.classes.add'
  | 'customContent.editor.classes.empty'
  | 'customContent.editor.classes.remove'
  | 'customContent.editor.classForm.title'
  | 'customContent.editor.classForm.intro'
  | 'customContent.editor.classForm.id'
  | 'customContent.editor.classForm.idHelper'
  | 'customContent.editor.classForm.nameFr'
  | 'customContent.editor.classForm.nameEn'
  | 'customContent.editor.classForm.descriptionFr'
  | 'customContent.editor.classForm.descriptionEn'
  | 'customContent.editor.classForm.hitDie'
  | 'customContent.editor.classForm.hitDieHelper'
  | 'customContent.editor.classForm.primaryAbilityLegend'
  | 'customContent.editor.classForm.primaryAbilityHelper'
  | 'customContent.editor.classForm.saveProficienciesLegend'
  | 'customContent.editor.classForm.saveProficienciesHelper'
  | 'customContent.editor.classForm.skillChoicesLegend'
  | 'customContent.editor.classForm.skillChoicesHelper'
  | 'customContent.editor.classForm.skillChoiceCount'
  | 'customContent.editor.classForm.skillChoiceFrom'
  | 'customContent.editor.classForm.skillChoiceFromHelper'
  | 'customContent.editor.classForm.skillChoiceFromPlaceholder'
  | 'customContent.editor.classForm.skillChoiceFromEmpty'
  | 'customContent.editor.classForm.armorProficiencies'
  | 'customContent.editor.classForm.armorProficienciesHelper'
  | 'customContent.editor.classForm.armorProficienciesPlaceholder'
  | 'customContent.editor.classForm.armorProficienciesEmpty'
  | 'customContent.editor.classForm.weaponProficiencies'
  | 'customContent.editor.classForm.weaponProficienciesHelper'
  | 'customContent.editor.classForm.weaponProficienciesPlaceholder'
  | 'customContent.editor.classForm.weaponProficienciesEmpty'
  | 'customContent.editor.classForm.toolProficiencies'
  | 'customContent.editor.classForm.toolProficienciesHelper'
  | 'customContent.editor.classForm.toolProficienciesPlaceholder'
  | 'customContent.editor.classForm.toolProficienciesEmpty'
  | 'customContent.editor.classForm.chipAdd'
  | 'customContent.editor.classForm.chipInputLabel'
  | 'customContent.editor.classForm.spellcastingLegend'
  | 'customContent.editor.classForm.spellcastingHelper'
  | 'customContent.editor.classForm.spellcastingToggle'
  | 'customContent.editor.classForm.spellcastingAbility'
  | 'customContent.editor.classForm.spellcastingProgression'
  | 'customContent.editor.classForm.spellcastingProgression.full'
  | 'customContent.editor.classForm.spellcastingProgression.half'
  | 'customContent.editor.classForm.spellcastingProgression.third'
  | 'customContent.editor.classForm.spellcastingProgression.pact'
  | 'customContent.editor.classForm.startingEquipmentLegend'
  | 'customContent.editor.classForm.startingEquipmentHelper'
  | 'customContent.editor.classForm.startingItemsEmpty'
  | 'customContent.editor.classForm.startingItemAdd'
  | 'customContent.editor.classForm.startingItemId'
  | 'customContent.editor.classForm.startingItemIdPlaceholder'
  | 'customContent.editor.classForm.startingItemQty'
  | 'customContent.editor.classForm.startingCoinsToggle'
  | 'customContent.editor.classForm.startingCoinsQty'
  | 'customContent.editor.classForm.startingCoinsUnit'
  | 'customContent.editor.classForm.featuresLegend'
  | 'customContent.editor.classForm.featuresHelper'
  | 'customContent.editor.classForm.featuresEmpty'
  | 'customContent.editor.classForm.featureAdd'
  | 'customContent.editor.classForm.featureLevel'
  | 'customContent.editor.classForm.featureNameFr'
  | 'customContent.editor.classForm.featureNameEn'
  | 'customContent.editor.classForm.featureDescriptionFr'
  | 'customContent.editor.classForm.featureDescriptionEn'
  | 'customContent.editor.classForm.multiclassLegend'
  | 'customContent.editor.classForm.multiclassHelper'
  | 'customContent.editor.classForm.multiclassToggle'
  | 'customContent.editor.classForm.multiclassCombinator'
  | 'customContent.editor.classForm.multiclassCombinatorAnd'
  | 'customContent.editor.classForm.multiclassCombinatorOr'
  | 'customContent.editor.classForm.multiclassMinimaEmpty'
  | 'customContent.editor.classForm.multiclassMinAdd'
  | 'customContent.editor.classForm.multiclassMinAbility'
  | 'customContent.editor.classForm.multiclassMinAbilityPlaceholder'
  | 'customContent.editor.classForm.multiclassMinValue'
  | 'customContent.editor.classForm.multiclassArmor'
  | 'customContent.editor.classForm.multiclassArmorHelper'
  | 'customContent.editor.classForm.multiclassArmorPlaceholder'
  | 'customContent.editor.classForm.multiclassArmorEmpty'
  | 'customContent.editor.classForm.multiclassWeapons'
  | 'customContent.editor.classForm.multiclassWeaponsHelper'
  | 'customContent.editor.classForm.multiclassWeaponsPlaceholder'
  | 'customContent.editor.classForm.multiclassWeaponsEmpty'
  | 'customContent.editor.classForm.multiclassTools'
  | 'customContent.editor.classForm.multiclassToolsHelper'
  | 'customContent.editor.classForm.multiclassToolsPlaceholder'
  | 'customContent.editor.classForm.multiclassToolsEmpty'
  | 'customContent.editor.classForm.removeRow'
  | 'customContent.editor.classForm.cancel'
  | 'customContent.editor.classForm.confirm'
  | 'customContent.editor.classForm.error.idRequired'
  | 'customContent.editor.classForm.error.idFormat'
  | 'customContent.editor.classForm.error.idReserved'
  | 'customContent.editor.classForm.error.nameFrRequired'
  | 'customContent.editor.classForm.error.descriptionFrRequired'
  | 'customContent.editor.classForm.error.primaryAbilityRequired'
  | 'customContent.editor.classForm.error.saveProficienciesRequired'
  | 'customContent.editor.classForm.error.skillChoiceCountInvalid'
  | 'customContent.editor.classForm.error.skillChoiceFromTooShort'
  | 'customContent.editor.classForm.error.featureIncomplete'
  | 'customContent.editor.classForm.error.coinsInvalid'
  | 'customContent.editor.classForm.error.startingItemIdFormat'
  | 'customContent.editor.classForm.error.startingItemQtyInvalid'
  | 'customContent.editor.classForm.error.multiclassMinimumRequired'
  | 'customContent.editor.classForm.error.multiclassMinimumAbilityRequired'
  | 'customContent.editor.classForm.error.multiclassMinimumDuplicate'
  | 'customContent.editor.classForm.error.multiclassMinimumOutOfRange';

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
    // Types de dégâts (SRD 5.2.1 FR — labels canoniques sing. capitalisés)
    'damageType.acid': 'Acide',
    'damageType.bludgeoning': 'Contondant',
    'damageType.cold': 'Froid',
    'damageType.fire': 'Feu',
    'damageType.force': 'Force',
    'damageType.lightning': 'Foudre',
    'damageType.necrotic': 'Nécrotique',
    'damageType.piercing': 'Perforant',
    'damageType.poison': 'Poison',
    'damageType.psychic': 'Psychique',
    'damageType.radiant': 'Radiant',
    'damageType.slashing': 'Tranchant',
    'damageType.thunder': 'Tonnerre',
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
    'customContent.editor.subancestries.add':
      'Ajouter une sous-ascendance',
    'customContent.editor.subancestries.empty':
      'Aucune sous-ascendance ajoutée pour l’instant.',
    'customContent.editor.subancestries.remove': 'Retirer',
    'customContent.editor.backgrounds.add': 'Ajouter un historique',
    'customContent.editor.backgrounds.empty':
      'Aucun historique ajouté pour l’instant.',
    'customContent.editor.backgrounds.remove': 'Retirer',
    'customContent.editor.subclasses.add': 'Ajouter une sous-classe',
    'customContent.editor.subclasses.empty':
      'Aucune sous-classe ajoutée pour l’instant.',
    'customContent.editor.subclasses.remove': 'Retirer',
    'customContent.editor.spells.add': 'Ajouter un sort',
    'customContent.editor.spells.empty': 'Aucun sort ajouté pour l’instant.',
    'customContent.editor.spells.remove': 'Retirer',
    'customContent.editor.comingSoon.title': 'Autres catégories — bientôt',
    'customContent.editor.comingSoon.body':
      'Les classes seront éditables in-app dans une prochaine mise à jour. Pour cette catégorie, l’import par fichier reste disponible.',
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
    'customContent.editor.subancestryForm.title':
      'Nouvelle sous-ascendance',
    'customContent.editor.subancestryForm.id':
      'Identifiant de la sous-ascendance',
    'customContent.editor.subancestryForm.idHelper':
      'En kebab-case, unique dans le pack.',
    'customContent.editor.subancestryForm.ancestryId': 'Ascendance parente',
    'customContent.editor.subancestryForm.ancestryIdHelper':
      'Sélectionne l’ascendance SRD (ou d’un pack déjà importé) à laquelle cette sous-ascendance se rattache.',
    'customContent.editor.subancestryForm.ancestryIdPlaceholder':
      'Choisir une ascendance…',
    'customContent.editor.subancestryForm.ancestryIdLoading':
      'Chargement des ascendances…',
    'customContent.editor.subancestryForm.nameFr': 'Nom (FR)',
    'customContent.editor.subancestryForm.nameEn': 'Nom (EN, optionnel)',
    'customContent.editor.subancestryForm.descriptionFr': 'Description (FR)',
    'customContent.editor.subancestryForm.descriptionEn':
      'Description (EN, optionnelle)',
    'customContent.editor.subancestryForm.asisLegend':
      'Augmentations de caractéristique',
    'customContent.editor.subancestryForm.asisHelper':
      'Une ligne par caractéristique modifiée (par exemple FOR +2, CON +1).',
    'customContent.editor.subancestryForm.asisEmpty':
      'Aucune augmentation pour l’instant.',
    'customContent.editor.subancestryForm.asiAdd':
      'Ajouter une augmentation',
    'customContent.editor.subancestryForm.asiAbility': 'Caractéristique',
    'customContent.editor.subancestryForm.asiAbilityPlaceholder':
      'Choisir…',
    'customContent.editor.subancestryForm.asiBonus': 'Bonus',
    'customContent.editor.subancestryForm.traitsLegend': 'Traits',
    'customContent.editor.subancestryForm.traitsHelper':
      'Capacités héritées par tout personnage de cette sous-ascendance.',
    'customContent.editor.subancestryForm.traitsEmpty':
      'Aucun trait pour l’instant.',
    'customContent.editor.subancestryForm.traitAdd': 'Ajouter un trait',
    'customContent.editor.subancestryForm.traitNameFr': 'Nom du trait (FR)',
    'customContent.editor.subancestryForm.traitNameEn':
      'Nom du trait (EN, optionnel)',
    'customContent.editor.subancestryForm.traitDescriptionFr':
      'Description du trait (FR)',
    'customContent.editor.subancestryForm.traitDescriptionEn':
      'Description du trait (EN, optionnelle)',
    'customContent.editor.subancestryForm.removeRow': 'Retirer',
    'customContent.editor.subancestryForm.cancel': 'Annuler',
    'customContent.editor.subancestryForm.confirm':
      'Confirmer la sous-ascendance',
    'customContent.editor.subancestryForm.error.idRequired':
      'L’identifiant est requis.',
    'customContent.editor.subancestryForm.error.idFormat':
      'L’identifiant doit être en kebab-case (lettres minuscules, chiffres, tirets).',
    'customContent.editor.subancestryForm.error.ancestryIdRequired':
      'Sélectionne l’ascendance parente.',
    'customContent.editor.subancestryForm.error.nameFrRequired':
      'Le nom (FR) est requis.',
    'customContent.editor.subancestryForm.error.descriptionFrRequired':
      'La description (FR) est requise.',
    'customContent.editor.subancestryForm.error.asiAbilityRequired':
      'Chaque ligne doit choisir une caractéristique (sinon elle est ignorée).',
    'customContent.editor.subancestryForm.error.asiDuplicate':
      'Une même caractéristique ne peut pas apparaître deux fois.',
    'customContent.editor.subancestryForm.error.traitIncomplete':
      'Chaque trait demande un nom (FR) et une description (FR).',
    'customContent.editor.backgroundForm.title': 'Nouvel historique',
    'customContent.editor.backgroundForm.id': 'Identifiant de l’historique',
    'customContent.editor.backgroundForm.idHelper':
      'En kebab-case, unique dans le pack.',
    'customContent.editor.backgroundForm.nameFr': 'Nom (FR)',
    'customContent.editor.backgroundForm.nameEn': 'Nom (EN, optionnel)',
    'customContent.editor.backgroundForm.descriptionFr': 'Description (FR)',
    'customContent.editor.backgroundForm.descriptionEn':
      'Description (EN, optionnelle)',
    'customContent.editor.backgroundForm.skillsLegend':
      'Compétences maîtrisées',
    'customContent.editor.backgroundForm.skillsHelper':
      'Sélectionne les compétences offertes par l’historique (cliquer pour activer / désactiver).',
    'customContent.editor.backgroundForm.toolsLegend':
      'Outils maîtrisés',
    'customContent.editor.backgroundForm.toolsHelper':
      'Identifiants d’outils (ex. thieves-tools, calligraphers-supplies). Une ligne par outil.',
    'customContent.editor.backgroundForm.toolsEmpty':
      'Aucun outil pour l’instant.',
    'customContent.editor.backgroundForm.toolAdd': 'Identifiant de l’outil',
    'customContent.editor.backgroundForm.toolAddPlaceholder':
      'p. ex. thieves-tools',
    'customContent.editor.backgroundForm.toolAddButton': 'Ajouter',
    'customContent.editor.backgroundForm.languages': 'Langues bonus',
    'customContent.editor.backgroundForm.languagesHelper':
      'Nombre de langues supplémentaires que le PJ choisit à la création (0 si aucune).',
    'customContent.editor.backgroundForm.equipmentLegend':
      'Équipement de départ',
    'customContent.editor.backgroundForm.equipmentHelper':
      'Chaque ligne référence un item de la base (items.json) — pas de chaîne libre.',
    'customContent.editor.backgroundForm.equipmentEmpty':
      'Aucun équipement pour l’instant.',
    'customContent.editor.backgroundForm.equipmentAdd':
      'Ajouter un équipement',
    'customContent.editor.backgroundForm.equipmentItemId': 'Item',
    'customContent.editor.backgroundForm.equipmentItemIdPlaceholder':
      'Choisir un item…',
    'customContent.editor.backgroundForm.equipmentItemIdLoading':
      'Chargement des items…',
    'customContent.editor.backgroundForm.equipmentQty': 'Quantité',
    'customContent.editor.backgroundForm.coinsLegend': 'Pièces de départ',
    'customContent.editor.backgroundForm.coinsToggle':
      'L’historique offre des pièces',
    'customContent.editor.backgroundForm.coinsQty': 'Quantité',
    'customContent.editor.backgroundForm.coinsUnit': 'Unité',
    'customContent.editor.backgroundForm.coinUnit.cp': 'PC (cuivre)',
    'customContent.editor.backgroundForm.coinUnit.sp': 'PA (argent)',
    'customContent.editor.backgroundForm.coinUnit.ep': 'PE (électrum)',
    'customContent.editor.backgroundForm.coinUnit.gp': 'PO (or)',
    'customContent.editor.backgroundForm.coinUnit.pp': 'PP (platine)',
    'customContent.editor.backgroundForm.featureLegend': 'Don / bonus offert',
    'customContent.editor.backgroundForm.featureHelper':
      'Capacité particulière que l’historique offre au PJ.',
    'customContent.editor.backgroundForm.featureNameFr': 'Nom du don (FR)',
    'customContent.editor.backgroundForm.featureNameEn':
      'Nom du don (EN, optionnel)',
    'customContent.editor.backgroundForm.featureDescriptionFr':
      'Description du don (FR)',
    'customContent.editor.backgroundForm.featureDescriptionEn':
      'Description du don (EN, optionnelle)',
    'customContent.editor.backgroundForm.removeRow': 'Retirer',
    'customContent.editor.backgroundForm.cancel': 'Annuler',
    'customContent.editor.backgroundForm.confirm':
      'Confirmer l’historique',
    'customContent.editor.backgroundForm.error.idRequired':
      'L’identifiant est requis.',
    'customContent.editor.backgroundForm.error.idFormat':
      'L’identifiant doit être en kebab-case (lettres minuscules, chiffres, tirets).',
    'customContent.editor.backgroundForm.error.nameFrRequired':
      'Le nom (FR) est requis.',
    'customContent.editor.backgroundForm.error.descriptionFrRequired':
      'La description (FR) est requise.',
    'customContent.editor.backgroundForm.error.featureNameFrRequired':
      'Le nom du don (FR) est requis.',
    'customContent.editor.backgroundForm.error.featureDescriptionFrRequired':
      'La description du don (FR) est requise.',
    'customContent.editor.backgroundForm.error.equipmentItemIdRequired':
      'Chaque ligne d’équipement doit choisir un item (sinon elle est ignorée).',
    'customContent.editor.backgroundForm.error.equipmentDuplicate':
      'Un même item ne peut pas apparaître deux fois — additionne les quantités.',
    'customContent.editor.backgroundForm.error.equipmentQtyInvalid':
      'La quantité doit être un entier supérieur à zéro.',
    'customContent.editor.subclassForm.title': 'Nouvelle sous-classe',
    'customContent.editor.subclassForm.id': 'Identifiant de la sous-classe',
    'customContent.editor.subclassForm.idHelper':
      'En kebab-case, unique dans le pack.',
    'customContent.editor.subclassForm.classId': 'Classe parente',
    'customContent.editor.subclassForm.classIdHelper':
      'Sélectionne la classe SRD (ou d’un pack déjà importé) à laquelle cette sous-classe se rattache.',
    'customContent.editor.subclassForm.classIdPlaceholder':
      'Choisir une classe…',
    'customContent.editor.subclassForm.classIdLoading':
      'Chargement des classes…',
    'customContent.editor.subclassForm.nameFr': 'Nom (FR)',
    'customContent.editor.subclassForm.nameEn': 'Nom (EN, optionnel)',
    'customContent.editor.subclassForm.descriptionFr': 'Description (FR)',
    'customContent.editor.subclassForm.descriptionEn':
      'Description (EN, optionnelle)',
    'customContent.editor.subclassForm.featuresLegend': 'Aptitudes par niveau',
    'customContent.editor.subclassForm.featuresHelper':
      'Une entrée par aptitude obtenue. Précise le niveau (1-20), le nom et la description.',
    'customContent.editor.subclassForm.featuresEmpty':
      'Aucune aptitude pour l’instant.',
    'customContent.editor.subclassForm.featureAdd': 'Ajouter une aptitude',
    'customContent.editor.subclassForm.featureLevel': 'Niveau',
    'customContent.editor.subclassForm.featureNameFr': 'Nom de l’aptitude (FR)',
    'customContent.editor.subclassForm.featureNameEn':
      'Nom de l’aptitude (EN, optionnel)',
    'customContent.editor.subclassForm.featureDescriptionFr':
      'Description de l’aptitude (FR)',
    'customContent.editor.subclassForm.featureDescriptionEn':
      'Description de l’aptitude (EN, optionnelle)',
    'customContent.editor.subclassForm.removeRow': 'Retirer',
    'customContent.editor.subclassForm.cancel': 'Annuler',
    'customContent.editor.subclassForm.confirm': 'Confirmer la sous-classe',
    'customContent.editor.subclassForm.error.idRequired':
      'L’identifiant est requis.',
    'customContent.editor.subclassForm.error.idFormat':
      'L’identifiant doit être en kebab-case (lettres minuscules, chiffres, tirets).',
    'customContent.editor.subclassForm.error.classIdRequired':
      'Sélectionne la classe parente.',
    'customContent.editor.subclassForm.error.nameFrRequired':
      'Le nom (FR) est requis.',
    'customContent.editor.subclassForm.error.descriptionFrRequired':
      'La description (FR) est requise.',
    'customContent.editor.subclassForm.error.featureIncomplete':
      'Chaque aptitude demande un nom (FR) et une description (FR).',
    'customContent.editor.subclassForm.error.featureDuplicate':
      'Une même aptitude (niveau + nom) ne peut pas apparaître deux fois.',
    'customContent.editor.spellForm.title': 'Nouveau sort',
    'customContent.editor.spellForm.id': 'Identifiant du sort',
    'customContent.editor.spellForm.idHelper':
      'En kebab-case, unique dans le pack (ex. boule-de-feu-arcadienne).',
    'customContent.editor.spellForm.nameFr': 'Nom (FR)',
    'customContent.editor.spellForm.nameEn': 'Nom (EN, optionnel)',
    'customContent.editor.spellForm.level': 'Niveau',
    'customContent.editor.spellForm.levelHelper':
      '0 = sort mineur (cantrip). 1-9 pour les sorts à emplacement.',
    'customContent.editor.spellForm.school': 'École',
    'customContent.editor.spellForm.schoolPlaceholder': 'Choisir une école…',
    'customContent.editor.spellForm.castingTimeFr': 'Temps d’incantation (FR)',
    'customContent.editor.spellForm.castingTimeEn':
      'Temps d’incantation (EN, optionnel)',
    'customContent.editor.spellForm.castingTimeHelper':
      'Ex. « 1 action », « 1 action bonus », « 1 minute ».',
    'customContent.editor.spellForm.rangeFr': 'Portée (FR)',
    'customContent.editor.spellForm.rangeEn': 'Portée (EN, optionnelle)',
    'customContent.editor.spellForm.rangeHelper':
      'Ex. « Personnelle », « Toucher », « 18 mètres ».',
    'customContent.editor.spellForm.durationFr': 'Durée (FR)',
    'customContent.editor.spellForm.durationEn': 'Durée (EN, optionnelle)',
    'customContent.editor.spellForm.durationHelper':
      'Ex. « Instantanée », « 1 minute », « 24 heures ».',
    'customContent.editor.spellForm.componentsLegend': 'Composantes',
    'customContent.editor.spellForm.componentsHelper':
      'Active V (verbal), S (somatique) ou M (matériel). Un sort peut combiner plusieurs composantes.',
    'customContent.editor.spellForm.componentV': 'V (verbal)',
    'customContent.editor.spellForm.componentS': 'S (somatique)',
    'customContent.editor.spellForm.componentM': 'M (matériel)',
    'customContent.editor.spellForm.materialFr': 'Composante matérielle (FR)',
    'customContent.editor.spellForm.materialEn':
      'Composante matérielle (EN, optionnelle)',
    'customContent.editor.spellForm.materialHelper':
      'Ex. « une perle de 100 po » ou « une bougie ».',
    'customContent.editor.spellForm.concentration': 'Concentration',
    'customContent.editor.spellForm.concentrationHelper':
      'Le sort demande de maintenir la concentration pour durer.',
    'customContent.editor.spellForm.ritual': 'Rituel',
    'customContent.editor.spellForm.ritualHelper':
      'Le sort peut être lancé en 10 minutes sans consommer d’emplacement.',
    'customContent.editor.spellForm.descriptionFr': 'Description (FR)',
    'customContent.editor.spellForm.descriptionEn':
      'Description (EN, optionnelle)',
    'customContent.editor.spellForm.descriptionHelper':
      'Effet complet du sort tel qu’il apparaîtra sur la fiche.',
    'customContent.editor.spellForm.hasAtHigherLevels':
      'Effets aux niveaux supérieurs',
    'customContent.editor.spellForm.hasAtHigherLevelsHelper':
      'Active si le sort change quand il est lancé avec un emplacement supérieur.',
    'customContent.editor.spellForm.atHigherLevelsFr':
      'Aux niveaux supérieurs (FR)',
    'customContent.editor.spellForm.atHigherLevelsEn':
      'Aux niveaux supérieurs (EN, optionnel)',
    'customContent.editor.spellForm.classesLegend': 'Classes',
    'customContent.editor.spellForm.classesHelper':
      'Quelles classes ont accès à ce sort. Une au moins est recommandée pour qu’il apparaisse au wizard.',
    'customContent.editor.spellForm.classesLoading': 'Chargement des classes…',
    'customContent.editor.spellForm.classesEmpty':
      'Aucune classe disponible — vérifie que le bundle SRD est bien chargé.',
    'customContent.editor.spellForm.damageLegend': 'Dégâts',
    'customContent.editor.spellForm.damageHelper':
      'Optionnel — un sort utilitaire ou de contrôle peut n’avoir aucune ligne de dégâts.',
    'customContent.editor.spellForm.damageEmpty':
      'Aucun dégât pour l’instant.',
    'customContent.editor.spellForm.damageAdd': 'Ajouter une ligne de dégâts',
    'customContent.editor.spellForm.damageFormula': 'Formule (dés)',
    'customContent.editor.spellForm.damageFormulaPlaceholder': 'ex. 8d6',
    'customContent.editor.spellForm.damageType': 'Type de dégâts',
    'customContent.editor.spellForm.damageTypeLabelFr':
      'Libellé affiché (FR)',
    'customContent.editor.spellForm.damageTypeLabelEn':
      'Libellé affiché (EN, optionnel)',
    'customContent.editor.spellForm.damageHasUpcast':
      'Effets aux niveaux supérieurs',
    'customContent.editor.spellForm.damageHasUpcastHelper':
      'Combien la formule augmente par emplacement au-dessus du niveau de base.',
    'customContent.editor.spellForm.damageUpcastPerLevel':
      'Dés ajoutés par niveau supérieur',
    'customContent.editor.spellForm.damageUpcastPerLevelHelper':
      'Ex. « +1d6 » par emplacement au-dessus du niveau de base.',
    'customContent.editor.spellForm.damageUpcastPerLevelPlaceholder':
      'ex. +1d6',
    'customContent.editor.spellForm.removeRow': 'Retirer',
    'customContent.editor.spellForm.cancel': 'Annuler',
    'customContent.editor.spellForm.confirm': 'Confirmer le sort',
    'customContent.editor.spellForm.error.idRequired':
      'L’identifiant est requis.',
    'customContent.editor.spellForm.error.idFormat':
      'L’identifiant doit être en kebab-case (lettres minuscules, chiffres, tirets).',
    'customContent.editor.spellForm.error.nameFrRequired':
      'Le nom (FR) est requis.',
    'customContent.editor.spellForm.error.schoolRequired':
      'Sélectionne une école de magie.',
    'customContent.editor.spellForm.error.castingTimeFrRequired':
      'Le temps d’incantation (FR) est requis.',
    'customContent.editor.spellForm.error.rangeFrRequired':
      'La portée (FR) est requise.',
    'customContent.editor.spellForm.error.durationFrRequired':
      'La durée (FR) est requise.',
    'customContent.editor.spellForm.error.descriptionFrRequired':
      'La description (FR) est requise.',
    'customContent.editor.spellForm.error.materialFrRequired':
      'Décris la composante matérielle (FR) quand M est activé.',
    'customContent.editor.spellForm.error.atHigherLevelsFrRequired':
      'Décris l’effet (FR) aux niveaux supérieurs ou désactive la case.',
    'customContent.editor.spellForm.error.damageIncomplete':
      'Chaque ligne de dégâts demande une formule et un libellé (FR).',
    'customContent.editor.spellForm.error.damageDuplicate':
      'Un même type de dégâts ne peut pas apparaître deux fois — additionne les formules.',
    // Items — listes dans PackEditor
    'customContent.editor.items.add': 'Ajouter un objet',
    'customContent.editor.items.empty': 'Aucun objet ajouté pour l’instant.',
    'customContent.editor.items.remove': 'Retirer',
    // ItemForm — communs
    'customContent.editor.itemForm.title': 'Nouvel objet',
    'customContent.editor.itemForm.id': 'Identifiant de l’objet',
    'customContent.editor.itemForm.idHelper':
      'En kebab-case, unique dans le pack.',
    'customContent.editor.itemForm.nameFr': 'Nom (FR)',
    'customContent.editor.itemForm.nameEn': 'Nom (EN, optionnel)',
    'customContent.editor.itemForm.category': 'Catégorie',
    'customContent.editor.itemForm.categoryPlaceholder':
      'Choisis une catégorie…',
    'customContent.editor.itemForm.hasCost': 'Coût indiqué',
    'customContent.editor.itemForm.hasCostHelper':
      'Coche si l’objet a un prix marchand. Sinon on laisse vide (objet de quête, butin).',
    'customContent.editor.itemForm.costQty': 'Quantité',
    'customContent.editor.itemForm.costUnit': 'Monnaie',
    'customContent.editor.itemForm.costUnitPlaceholder': 'Choisis la monnaie…',
    'customContent.editor.itemForm.weight': 'Poids (en livres)',
    'customContent.editor.itemForm.weightHelper':
      '0 si négligeable. 1 livre ≈ 0,5 kg.',
    'customContent.editor.itemForm.hasDescription': 'Description riche',
    'customContent.editor.itemForm.hasDescriptionHelper':
      'Coche pour ajouter une description longue (effet, fluff). Sinon le nom suffit.',
    'customContent.editor.itemForm.descriptionFr': 'Description (FR)',
    'customContent.editor.itemForm.descriptionEn':
      'Description (EN, optionnelle)',
    'customContent.editor.itemForm.descriptionHelper':
      'Phrase ou paragraphe affiché dans le détail de l’objet.',
    // ItemForm — Arme
    'customContent.editor.itemForm.weaponLegend': 'Arme',
    'customContent.editor.itemForm.weaponHelper':
      'Caractéristiques propres aux armes — dégâts, propriétés, portée, maîtrise.',
    'customContent.editor.itemForm.hasDamage': 'Dégâts indiqués',
    'customContent.editor.itemForm.hasDamageHelper':
      'Coche pour préciser une formule de dégâts (la plupart des armes en ont).',
    'customContent.editor.itemForm.damageDice': 'Dés de dégâts',
    'customContent.editor.itemForm.damageDicePlaceholder': 'ex. 1d8',
    'customContent.editor.itemForm.damageType': 'Type de dégâts',
    'customContent.editor.itemForm.damageTypeLabelFr':
      'Libellé d’affichage (FR)',
    'customContent.editor.itemForm.damageTypeLabelEn':
      'Libellé d’affichage (EN, optionnel)',
    'customContent.editor.itemForm.hasRange': 'Arme à distance ou allonge',
    'customContent.editor.itemForm.hasRangeHelper':
      'Coche pour les armes à distance ou avec portée (arc, javelot, dague de lancer).',
    'customContent.editor.itemForm.rangeNormal': 'Portée normale (pieds)',
    'customContent.editor.itemForm.rangeMax': 'Portée maximale (pieds)',
    'customContent.editor.itemForm.rangeHelper':
      'Au-delà de la portée normale, l’attaque est faite avec désavantage.',
    'customContent.editor.itemForm.hasMastery': 'Propriété de maîtrise',
    'customContent.editor.itemForm.hasMasteryHelper':
      'Coche pour assigner une propriété de Maîtrise d’arme (Cleave, Graze, Nick…).',
    'customContent.editor.itemForm.masteryProperty': 'Propriété de maîtrise',
    'customContent.editor.itemForm.masteryPlaceholder': 'Choisis une maîtrise…',
    'customContent.editor.itemForm.propertiesLegend': 'Propriétés',
    'customContent.editor.itemForm.propertiesHelper':
      'Mots-clés libres (ex. « finesse », « heavy », « versatile »). Réutilise les conventions SRD si possible.',
    'customContent.editor.itemForm.propertyAdd': 'Ajouter une propriété',
    'customContent.editor.itemForm.propertyPlaceholder':
      'ex. finesse, versatile',
    'customContent.editor.itemForm.propertyEmpty':
      'Aucune propriété pour l’instant.',
    // ItemForm — Armure / Bouclier
    'customContent.editor.itemForm.armorLegend': 'Armure',
    'customContent.editor.itemForm.armorHelper':
      'Caractéristiques propres aux armures et boucliers — CA de base, limite Dex, force requise, discrétion.',
    'customContent.editor.itemForm.acBase': 'CA de base',
    'customContent.editor.itemForm.acBaseHelper':
      'Ex. 11 pour cuir, 16 pour cotte de mailles. Pour un bouclier, on entre +2 (le bouclier ajoute, il ne pose pas un total).',
    'customContent.editor.itemForm.hasAcDexMax': 'Limite de Dextérité',
    'customContent.editor.itemForm.hasAcDexMaxHelper':
      'Coche si l’armure plafonne l’ajout de Dex. Laisser décoché pour les armures légères (Dex complète ajoutée).',
    'customContent.editor.itemForm.acDexMax': 'Limite Dex (en bonus max)',
    'customContent.editor.itemForm.acDexMaxHelper':
      '0 pour armure lourde (aucun bonus de Dex), 2 pour armure intermédiaire.',
    'customContent.editor.itemForm.hasStrRequired': 'Force requise',
    'customContent.editor.itemForm.hasStrRequiredHelper':
      'Coche si porter l’armure exige une Force minimale (cotte de mailles 13, harnois 15).',
    'customContent.editor.itemForm.strRequired': 'Score de Force minimal',
    'customContent.editor.itemForm.stealthDisadvantage':
      'Désavantage en Discrétion',
    'customContent.editor.itemForm.stealthDisadvantageHelper':
      'Coche si l’armure impose un désavantage aux jets de Discrétion (Dex).',
    // Actions
    'customContent.editor.itemForm.removeRow': 'Retirer',
    'customContent.editor.itemForm.cancel': 'Annuler',
    'customContent.editor.itemForm.confirm': 'Confirmer l’objet',
    // Erreurs
    'customContent.editor.itemForm.error.idRequired':
      'L’identifiant est requis.',
    'customContent.editor.itemForm.error.idFormat':
      'L’identifiant doit être en kebab-case (lettres minuscules, chiffres, tirets).',
    'customContent.editor.itemForm.error.nameFrRequired':
      'Le nom (FR) est requis.',
    'customContent.editor.itemForm.error.categoryRequired':
      'Sélectionne une catégorie d’objet.',
    'customContent.editor.itemForm.error.weightNegative':
      'Le poids ne peut pas être négatif.',
    'customContent.editor.itemForm.error.costQtyNegative':
      'La quantité de coût ne peut pas être négative.',
    'customContent.editor.itemForm.error.descriptionFrRequired':
      'Décris l’objet (FR) ou décoche la description riche.',
    'customContent.editor.itemForm.error.damageDiceRequired':
      'Indique les dés de dégâts (ex. 1d8) ou décoche les dégâts.',
    'customContent.editor.itemForm.error.damageTypeLabelFrRequired':
      'Indique le libellé du type de dégâts (FR).',
    'customContent.editor.itemForm.error.rangeNormalRequired':
      'Indique la portée normale en pieds.',
    'customContent.editor.itemForm.error.rangeMaxLessThanNormal':
      'La portée maximale doit être ≥ à la portée normale.',
    'customContent.editor.itemForm.error.acBaseRequired':
      'La CA de base est requise pour une armure ou un bouclier.',
    'customContent.editor.itemForm.error.strRequiredRequired':
      'Indique le score de Force minimal ou décoche la case.',
    'customContent.editor.itemForm.error.propertyDuplicate':
      'Cette propriété est déjà ajoutée.',
    'customContent.editor.itemForm.error.propertyEmpty':
      'Saisis un mot-clé non vide.',
    // Ancestry — pack editor (JALON 3C.8)
    'customContent.editor.ancestries.add': 'Ajouter une ascendance',
    'customContent.editor.ancestries.empty':
      'Aucune ascendance ajoutée pour l’instant.',
    'customContent.editor.ancestries.remove': 'Retirer',
    'customContent.editor.ancestryForm.title': 'Nouvelle ascendance',
    'customContent.editor.ancestryForm.id': 'Identifiant',
    'customContent.editor.ancestryForm.idHelper':
      'Slug en minuscules, chiffres et tirets (ex. : « peuple-des-brumes »). Évite les noms d’ascendances officielles (drakéide, elfe, gnome, gobelours, goliath, humain, tieffelin).',
    'customContent.editor.ancestryForm.nameFr': 'Nom (FR)',
    'customContent.editor.ancestryForm.nameEn': 'Nom (EN)',
    'customContent.editor.ancestryForm.size': 'Taille',
    'customContent.editor.ancestryForm.speed': 'Vitesse (cases)',
    'customContent.editor.ancestryForm.speedHelper':
      'Vitesse de déplacement de base, exprimée en cases de 1,5 m.',
    'customContent.editor.ancestryForm.descriptionFr': 'Description (FR)',
    'customContent.editor.ancestryForm.descriptionEn': 'Description (EN)',
    'customContent.editor.ancestryForm.asisLegend':
      'Bonus de caractéristiques',
    'customContent.editor.ancestryForm.asisHelper':
      'Ajoute un ou plusieurs bonus de caractéristique (un par caractéristique au maximum).',
    'customContent.editor.ancestryForm.asisEmpty':
      'Aucun bonus ajouté pour l’instant.',
    'customContent.editor.ancestryForm.asiAbility': 'Caractéristique',
    'customContent.editor.ancestryForm.asiAbilityPlaceholder':
      'Choisir une caractéristique',
    'customContent.editor.ancestryForm.asiBonus': 'Bonus',
    'customContent.editor.ancestryForm.asiAdd': 'Ajouter un bonus',
    'customContent.editor.ancestryForm.traitsLegend':
      'Traits raciaux',
    'customContent.editor.ancestryForm.traitsHelper':
      'Chaque trait porte un nom et une description. Au moins un trait est recommandé.',
    'customContent.editor.ancestryForm.traitsEmpty':
      'Aucun trait ajouté pour l’instant.',
    'customContent.editor.ancestryForm.traitNameFr': 'Nom du trait (FR)',
    'customContent.editor.ancestryForm.traitNameEn': 'Nom du trait (EN)',
    'customContent.editor.ancestryForm.traitDescriptionFr':
      'Description du trait (FR)',
    'customContent.editor.ancestryForm.traitDescriptionEn':
      'Description du trait (EN)',
    'customContent.editor.ancestryForm.traitAdd': 'Ajouter un trait',
    'customContent.editor.ancestryForm.languagesLegend': 'Langues',
    'customContent.editor.ancestryForm.languagesHelper':
      'Langues parlées dès le niveau 1. Saisis un nom de langue puis valide.',
    'customContent.editor.ancestryForm.languagesEmpty':
      'Aucune langue ajoutée pour l’instant.',
    'customContent.editor.ancestryForm.languageAdd': 'Nouvelle langue',
    'customContent.editor.ancestryForm.languageAddPlaceholder':
      'Ex. : commun, elfique, draconique…',
    'customContent.editor.ancestryForm.languageAddButton': 'Ajouter',
    'customContent.editor.ancestryForm.commonSpellsLegend':
      'Sorts d’ascendance',
    'customContent.editor.ancestryForm.commonSpellsHelper':
      'Sorts connus de toute l’ascendance (sélection multiple parmi les sorts disponibles).',
    'customContent.editor.ancestryForm.commonSpellsLoading':
      'Chargement des sorts…',
    'customContent.editor.ancestryForm.commonSpellsEmpty':
      'Aucun sort disponible — importe un pack contenant des sorts pour les associer.',
    'customContent.editor.ancestryForm.dragonLegend':
      'Ancêtres draconiques (optionnel)',
    'customContent.editor.ancestryForm.dragonHelper':
      'Pour les ascendances draconiques : associe un type de dégâts à un ancêtre nommé. Inutile si l’ascendance n’est pas draconique.',
    'customContent.editor.ancestryForm.dragonEmpty':
      'Aucun ancêtre draconique ajouté.',
    'customContent.editor.ancestryForm.dragonAdd': 'Ajouter un ancêtre',
    'customContent.editor.ancestryForm.dragonOptionId': 'Identifiant',
    'customContent.editor.ancestryForm.dragonOptionIdPlaceholder':
      'Ex. : ancetre-de-givre',
    'customContent.editor.ancestryForm.dragonOptionNameFr': 'Nom (FR)',
    'customContent.editor.ancestryForm.dragonOptionNameEn': 'Nom (EN)',
    'customContent.editor.ancestryForm.dragonOptionDamageType':
      'Type de dégâts',
    'customContent.editor.ancestryForm.dragonOptionDamageLabelFr':
      'Étiquette FR du type',
    'customContent.editor.ancestryForm.dragonOptionDamageLabelEn':
      'Étiquette EN du type',
    'customContent.editor.ancestryForm.giantLegend':
      'Ancêtres géants (optionnel)',
    'customContent.editor.ancestryForm.giantHelper':
      'Pour les ascendances géantes : associe un effet à un type d’ancêtre. Inutile si l’ascendance n’est pas une ascendance géante.',
    'customContent.editor.ancestryForm.giantEmpty':
      'Aucun ancêtre géant ajouté.',
    'customContent.editor.ancestryForm.giantAdd': 'Ajouter un ancêtre',
    'customContent.editor.ancestryForm.giantOptionId': 'Identifiant',
    'customContent.editor.ancestryForm.giantOptionIdPlaceholder':
      'Ex. : ancetre-de-pierre',
    'customContent.editor.ancestryForm.giantOptionNameFr': 'Nom (FR)',
    'customContent.editor.ancestryForm.giantOptionNameEn': 'Nom (EN)',
    'customContent.editor.ancestryForm.giantOptionEffectFr': 'Effet (FR)',
    'customContent.editor.ancestryForm.giantOptionEffectEn': 'Effet (EN)',
    'customContent.editor.ancestryForm.removeRow': 'Retirer',
    'customContent.editor.ancestryForm.cancel': 'Annuler',
    'customContent.editor.ancestryForm.confirm': 'Ajouter l’ascendance',
    'customContent.editor.ancestryForm.error.idRequired':
      'L’identifiant est obligatoire.',
    'customContent.editor.ancestryForm.error.idFormat':
      'Slug invalide : minuscules, chiffres et tirets uniquement.',
    'customContent.editor.ancestryForm.error.idReserved':
      'Cet identifiant est réservé aux ascendances officielles — utilise un slug spécifique à ta création.',
    'customContent.editor.ancestryForm.error.nameFrRequired':
      'Le nom FR est obligatoire.',
    'customContent.editor.ancestryForm.error.descriptionFrRequired':
      'La description FR est obligatoire.',
    'customContent.editor.ancestryForm.error.speedPositive':
      'La vitesse doit être strictement positive.',
    'customContent.editor.ancestryForm.error.asiAbilityRequired':
      'Chaque ligne doit cibler une caractéristique.',
    'customContent.editor.ancestryForm.error.asiDuplicate':
      'Une caractéristique ne peut être bonifiée qu’une seule fois.',
    'customContent.editor.ancestryForm.error.traitIncomplete':
      'Chaque trait doit avoir un nom FR et une description FR.',
    'customContent.editor.ancestryForm.error.dragonIncomplete':
      'Chaque ancêtre draconique doit avoir un identifiant, un nom FR et une étiquette FR de type de dégâts.',
    'customContent.editor.ancestryForm.error.dragonIdFormat':
      'Identifiant d’ancêtre draconique invalide : minuscules, chiffres et tirets uniquement.',
    'customContent.editor.ancestryForm.error.dragonDuplicate':
      'Deux ancêtres draconiques portent le même identifiant.',
    'customContent.editor.ancestryForm.error.giantIncomplete':
      'Chaque ancêtre géant doit avoir un identifiant, un nom FR et un effet FR.',
    'customContent.editor.ancestryForm.error.giantIdFormat':
      'Identifiant d’ancêtre géant invalide : minuscules, chiffres et tirets uniquement.',
    'customContent.editor.ancestryForm.error.giantDuplicate':
      'Deux ancêtres géants portent le même identifiant.',
    // Class — pack editor (JALON 3C.9)
    'customContent.editor.classes.add': 'Ajouter une classe',
    'customContent.editor.classes.empty':
      'Aucune classe ajoutée pour l’instant.',
    'customContent.editor.classes.remove': 'Retirer',
    'customContent.editor.classForm.title': 'Nouvelle classe',
    'customContent.editor.classForm.intro':
      'Form simple pour une classe maison. Pour une classe complexe (table de niveau L2-L20, sous-choix L1 type Ordre divin, Weapon Mastery), édite le JSON directement après l’export.',
    'customContent.editor.classForm.id': 'Identifiant',
    'customContent.editor.classForm.idHelper':
      'Slug en minuscules, chiffres et tirets (ex. : « cendre-pacte »). Évite les noms des 12 classes officielles (barbare, barde, clerc, druide, ensorceleur, guerrier, magicien, moine, occultiste, paladin, rôdeur, roublard).',
    'customContent.editor.classForm.nameFr': 'Nom (FR)',
    'customContent.editor.classForm.nameEn': 'Nom (EN)',
    'customContent.editor.classForm.descriptionFr': 'Description (FR)',
    'customContent.editor.classForm.descriptionEn': 'Description (EN)',
    'customContent.editor.classForm.hitDie': 'Dé de vie',
    'customContent.editor.classForm.hitDieHelper':
      'Dé lancé à chaque montée de niveau pour gagner des points de vie.',
    'customContent.editor.classForm.primaryAbilityLegend':
      'Caractéristique principale',
    'customContent.editor.classForm.primaryAbilityHelper':
      'Caractéristique(s) utilisée(s) pour les jets d’attaque et le DD des sorts de la classe. Sélectionne au moins une.',
    'customContent.editor.classForm.saveProficienciesLegend':
      'Jets de sauvegarde maîtrisés',
    'customContent.editor.classForm.saveProficienciesHelper':
      'Jets de sauvegarde dans lesquels la classe est entraînée (deux pour les classes SRD).',
    'customContent.editor.classForm.skillChoicesLegend':
      'Choix de compétences',
    'customContent.editor.classForm.skillChoicesHelper':
      'Au niveau 1, le joueur choisit `N` compétences parmi une liste fournie.',
    'customContent.editor.classForm.skillChoiceCount': 'Nombre à choisir',
    'customContent.editor.classForm.skillChoiceFrom': 'Compétences proposées',
    'customContent.editor.classForm.skillChoiceFromHelper':
      'Ajoute les compétences éligibles une par une (ex. : athlétisme, perception). La liste doit en contenir au moins autant que le nombre à choisir.',
    'customContent.editor.classForm.skillChoiceFromPlaceholder':
      'Ex. : athlétisme, perception, intimidation…',
    'customContent.editor.classForm.skillChoiceFromEmpty':
      'Aucune compétence proposée pour l’instant.',
    'customContent.editor.classForm.armorProficiencies':
      'Maîtrises d’armure',
    'customContent.editor.classForm.armorProficienciesHelper':
      'Ex. : armures légères, intermédiaires, lourdes, boucliers.',
    'customContent.editor.classForm.armorProficienciesPlaceholder':
      'Ex. : armures légères, boucliers…',
    'customContent.editor.classForm.armorProficienciesEmpty':
      'Aucune maîtrise d’armure pour l’instant.',
    'customContent.editor.classForm.weaponProficiencies':
      'Maîtrises d’armes',
    'customContent.editor.classForm.weaponProficienciesHelper':
      'Ex. : armes courantes, armes de guerre, ou liste précise d’armes.',
    'customContent.editor.classForm.weaponProficienciesPlaceholder':
      'Ex. : armes courantes, armes de guerre…',
    'customContent.editor.classForm.weaponProficienciesEmpty':
      'Aucune maîtrise d’armes pour l’instant.',
    'customContent.editor.classForm.toolProficiencies':
      'Maîtrises d’outils',
    'customContent.editor.classForm.toolProficienciesHelper':
      'Ex. : outils d’artisan, instrument de musique.',
    'customContent.editor.classForm.toolProficienciesPlaceholder':
      'Ex. : outils de voleur, instrument de musique…',
    'customContent.editor.classForm.toolProficienciesEmpty':
      'Aucune maîtrise d’outils pour l’instant.',
    'customContent.editor.classForm.chipAdd': 'Ajouter',
    'customContent.editor.classForm.chipInputLabel': 'Nouvelle valeur',
    'customContent.editor.classForm.spellcastingLegend': 'Incantation',
    'customContent.editor.classForm.spellcastingHelper':
      'Active si la classe lance des sorts. Définit la caractéristique d’incantation et la vitesse de progression.',
    'customContent.editor.classForm.spellcastingToggle':
      'Cette classe lance des sorts',
    'customContent.editor.classForm.spellcastingAbility':
      'Caractéristique d’incantation',
    'customContent.editor.classForm.spellcastingProgression':
      'Vitesse de progression',
    'customContent.editor.classForm.spellcastingProgression.full':
      'Lanceur complet',
    'customContent.editor.classForm.spellcastingProgression.half':
      'Demi-lanceur',
    'customContent.editor.classForm.spellcastingProgression.third':
      'Tiers de lanceur',
    'customContent.editor.classForm.spellcastingProgression.pact':
      'Magie de pacte',
    'customContent.editor.classForm.startingEquipmentLegend':
      'Équipement de départ',
    'customContent.editor.classForm.startingEquipmentHelper':
      'Une option d’équipement V1. Réfère des `id` d’objets (du pack ou du SRD). Les pièces optionnelles s’ajoutent en bas.',
    'customContent.editor.classForm.startingItemsEmpty':
      'Aucun objet de départ pour l’instant.',
    'customContent.editor.classForm.startingItemAdd': 'Ajouter un objet',
    'customContent.editor.classForm.startingItemId': 'Identifiant d’objet',
    'customContent.editor.classForm.startingItemIdPlaceholder':
      'Ex. : sword-longsword, kit-explorer…',
    'customContent.editor.classForm.startingItemQty': 'Quantité',
    'customContent.editor.classForm.startingCoinsToggle':
      'Ajouter des pièces de départ',
    'customContent.editor.classForm.startingCoinsQty': 'Quantité',
    'customContent.editor.classForm.startingCoinsUnit': 'Unité',
    'customContent.editor.classForm.featuresLegend': 'Aptitudes de classe',
    'customContent.editor.classForm.featuresHelper':
      'Ajoute les aptitudes par niveau. Pour la table complète L2-L20 d’une classe homebrew, édite plutôt le JSON après export.',
    'customContent.editor.classForm.featuresEmpty':
      'Aucune aptitude ajoutée pour l’instant.',
    'customContent.editor.classForm.featureAdd': 'Ajouter une aptitude',
    'customContent.editor.classForm.featureLevel': 'Niveau',
    'customContent.editor.classForm.featureNameFr': 'Nom de l’aptitude (FR)',
    'customContent.editor.classForm.featureNameEn': 'Nom de l’aptitude (EN)',
    'customContent.editor.classForm.featureDescriptionFr':
      'Description (FR)',
    'customContent.editor.classForm.featureDescriptionEn':
      'Description (EN)',
    'customContent.editor.classForm.multiclassLegend': 'Multi-classe',
    'customContent.editor.classForm.multiclassHelper':
      'Prérequis et maîtrises gagnées quand cette classe est ajoutée en multi-classe.',
    'customContent.editor.classForm.multiclassToggle':
      'Cette classe a des prérequis pour le multi-classage',
    'customContent.editor.classForm.multiclassCombinator': 'Combinaison',
    'customContent.editor.classForm.multiclassCombinatorAnd':
      'Toutes les conditions (ET)',
    'customContent.editor.classForm.multiclassCombinatorOr':
      'Au moins une condition (OU)',
    'customContent.editor.classForm.multiclassMinimaEmpty':
      'Aucun minimum ajouté — coche un prérequis pour rendre la classe accessible en multi-classe.',
    'customContent.editor.classForm.multiclassMinAdd':
      'Ajouter un prérequis',
    'customContent.editor.classForm.multiclassMinAbility':
      'Caractéristique',
    'customContent.editor.classForm.multiclassMinAbilityPlaceholder':
      'Choisir une caractéristique',
    'customContent.editor.classForm.multiclassMinValue': 'Minimum',
    'customContent.editor.classForm.multiclassArmor':
      'Armures gagnées en multi-classe',
    'customContent.editor.classForm.multiclassArmorHelper':
      'Maîtrises d’armures obtenues par le PJ qui prend un niveau dans cette classe en multi-classe.',
    'customContent.editor.classForm.multiclassArmorPlaceholder':
      'Ex. : armures légères, boucliers…',
    'customContent.editor.classForm.multiclassArmorEmpty':
      'Aucune armure gagnée en multi-classe.',
    'customContent.editor.classForm.multiclassWeapons':
      'Armes gagnées en multi-classe',
    'customContent.editor.classForm.multiclassWeaponsHelper':
      'Maîtrises d’armes obtenues par le PJ qui prend un niveau dans cette classe en multi-classe.',
    'customContent.editor.classForm.multiclassWeaponsPlaceholder':
      'Ex. : armes courantes…',
    'customContent.editor.classForm.multiclassWeaponsEmpty':
      'Aucune arme gagnée en multi-classe.',
    'customContent.editor.classForm.multiclassTools':
      'Outils gagnés en multi-classe',
    'customContent.editor.classForm.multiclassToolsHelper':
      'Maîtrises d’outils obtenues par le PJ qui prend un niveau dans cette classe en multi-classe.',
    'customContent.editor.classForm.multiclassToolsPlaceholder':
      'Ex. : outils d’artisan…',
    'customContent.editor.classForm.multiclassToolsEmpty':
      'Aucun outil gagné en multi-classe.',
    'customContent.editor.classForm.removeRow': 'Retirer',
    'customContent.editor.classForm.cancel': 'Annuler',
    'customContent.editor.classForm.confirm': 'Ajouter la classe',
    'customContent.editor.classForm.error.idRequired':
      'L’identifiant est obligatoire.',
    'customContent.editor.classForm.error.idFormat':
      'Slug invalide : minuscules, chiffres et tirets uniquement.',
    'customContent.editor.classForm.error.idReserved':
      'Cet identifiant est réservé aux 12 classes officielles — utilise un slug spécifique à ta création.',
    'customContent.editor.classForm.error.nameFrRequired':
      'Le nom FR est obligatoire.',
    'customContent.editor.classForm.error.descriptionFrRequired':
      'La description FR est obligatoire.',
    'customContent.editor.classForm.error.primaryAbilityRequired':
      'Choisis au moins une caractéristique principale.',
    'customContent.editor.classForm.error.saveProficienciesRequired':
      'Choisis au moins un jet de sauvegarde maîtrisé.',
    'customContent.editor.classForm.error.skillChoiceCountInvalid':
      'Le nombre de compétences à choisir doit être ≥ 0.',
    'customContent.editor.classForm.error.skillChoiceFromTooShort':
      'La liste de compétences proposées doit contenir au moins autant d’entrées que le nombre à choisir.',
    'customContent.editor.classForm.error.featureIncomplete':
      'Chaque aptitude doit avoir un niveau (1-20), un nom FR et une description FR.',
    'customContent.editor.classForm.error.coinsInvalid':
      'La quantité de pièces doit être un entier positif.',
    'customContent.editor.classForm.error.startingItemIdFormat':
      'Identifiant d’objet invalide : minuscules, chiffres et tirets uniquement.',
    'customContent.editor.classForm.error.startingItemQtyInvalid':
      'La quantité doit être strictement positive.',
    'customContent.editor.classForm.error.multiclassMinimumRequired':
      'Ajoute au moins un minimum de caractéristique.',
    'customContent.editor.classForm.error.multiclassMinimumAbilityRequired':
      'Chaque prérequis doit cibler une caractéristique.',
    'customContent.editor.classForm.error.multiclassMinimumDuplicate':
      'Une même caractéristique ne peut pas figurer deux fois dans les prérequis.',
    'customContent.editor.classForm.error.multiclassMinimumOutOfRange':
      'Le minimum doit être compris entre 1 et 20.',
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
    'damageType.acid': 'Acid',
    'damageType.bludgeoning': 'Bludgeoning',
    'damageType.cold': 'Cold',
    'damageType.fire': 'Fire',
    'damageType.force': 'Force',
    'damageType.lightning': 'Lightning',
    'damageType.necrotic': 'Necrotic',
    'damageType.piercing': 'Piercing',
    'damageType.poison': 'Poison',
    'damageType.psychic': 'Psychic',
    'damageType.radiant': 'Radiant',
    'damageType.slashing': 'Slashing',
    'damageType.thunder': 'Thunder',
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
    'customContent.editor.subancestries.add': 'Add a subancestry',
    'customContent.editor.subancestries.empty': 'No subancestries added yet.',
    'customContent.editor.subancestries.remove': 'Remove',
    'customContent.editor.backgrounds.add': 'Add a background',
    'customContent.editor.backgrounds.empty': 'No backgrounds added yet.',
    'customContent.editor.backgrounds.remove': 'Remove',
    'customContent.editor.subclasses.add': 'Add a subclass',
    'customContent.editor.subclasses.empty': 'No subclasses added yet.',
    'customContent.editor.subclasses.remove': 'Remove',
    'customContent.editor.spells.add': 'Add a spell',
    'customContent.editor.spells.empty': 'No spells added yet.',
    'customContent.editor.spells.remove': 'Remove',
    'customContent.editor.comingSoon.title': 'Other categories — coming soon',
    'customContent.editor.comingSoon.body':
      'Classes will be authorable in-app in an upcoming release. File import remains available for this category.',
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
    'customContent.editor.subancestryForm.title': 'New subancestry',
    'customContent.editor.subancestryForm.id': 'Subancestry identifier',
    'customContent.editor.subancestryForm.idHelper':
      'kebab-case, unique within the pack.',
    'customContent.editor.subancestryForm.ancestryId': 'Parent ancestry',
    'customContent.editor.subancestryForm.ancestryIdHelper':
      'Pick the SRD ancestry (or an ancestry from a previously imported pack) this subancestry attaches to.',
    'customContent.editor.subancestryForm.ancestryIdPlaceholder':
      'Choose an ancestry…',
    'customContent.editor.subancestryForm.ancestryIdLoading':
      'Loading ancestries…',
    'customContent.editor.subancestryForm.nameFr': 'Name (FR)',
    'customContent.editor.subancestryForm.nameEn': 'Name (EN, optional)',
    'customContent.editor.subancestryForm.descriptionFr': 'Description (FR)',
    'customContent.editor.subancestryForm.descriptionEn':
      'Description (EN, optional)',
    'customContent.editor.subancestryForm.asisLegend':
      'Ability score increases',
    'customContent.editor.subancestryForm.asisHelper':
      'One row per modified ability (e.g. STR +2, CON +1).',
    'customContent.editor.subancestryForm.asisEmpty': 'No ASI yet.',
    'customContent.editor.subancestryForm.asiAdd': 'Add an ASI',
    'customContent.editor.subancestryForm.asiAbility': 'Ability',
    'customContent.editor.subancestryForm.asiAbilityPlaceholder': 'Pick…',
    'customContent.editor.subancestryForm.asiBonus': 'Bonus',
    'customContent.editor.subancestryForm.traitsLegend': 'Traits',
    'customContent.editor.subancestryForm.traitsHelper':
      'Features inherited by any character of this subancestry.',
    'customContent.editor.subancestryForm.traitsEmpty': 'No trait yet.',
    'customContent.editor.subancestryForm.traitAdd': 'Add a trait',
    'customContent.editor.subancestryForm.traitNameFr': 'Trait name (FR)',
    'customContent.editor.subancestryForm.traitNameEn':
      'Trait name (EN, optional)',
    'customContent.editor.subancestryForm.traitDescriptionFr':
      'Trait description (FR)',
    'customContent.editor.subancestryForm.traitDescriptionEn':
      'Trait description (EN, optional)',
    'customContent.editor.subancestryForm.removeRow': 'Remove',
    'customContent.editor.subancestryForm.cancel': 'Cancel',
    'customContent.editor.subancestryForm.confirm': 'Confirm subancestry',
    'customContent.editor.subancestryForm.error.idRequired':
      'Identifier is required.',
    'customContent.editor.subancestryForm.error.idFormat':
      'Identifier must be kebab-case (lowercase letters, digits, dashes).',
    'customContent.editor.subancestryForm.error.ancestryIdRequired':
      'Pick a parent ancestry.',
    'customContent.editor.subancestryForm.error.nameFrRequired':
      'Name (FR) is required.',
    'customContent.editor.subancestryForm.error.descriptionFrRequired':
      'Description (FR) is required.',
    'customContent.editor.subancestryForm.error.asiAbilityRequired':
      'Each row must pick an ability (otherwise it is ignored).',
    'customContent.editor.subancestryForm.error.asiDuplicate':
      'The same ability cannot appear twice.',
    'customContent.editor.subancestryForm.error.traitIncomplete':
      'Each trait needs a name (FR) and a description (FR).',
    'customContent.editor.backgroundForm.title': 'New background',
    'customContent.editor.backgroundForm.id': 'Background identifier',
    'customContent.editor.backgroundForm.idHelper':
      'kebab-case, unique within the pack.',
    'customContent.editor.backgroundForm.nameFr': 'Name (FR)',
    'customContent.editor.backgroundForm.nameEn': 'Name (EN, optional)',
    'customContent.editor.backgroundForm.descriptionFr': 'Description (FR)',
    'customContent.editor.backgroundForm.descriptionEn':
      'Description (EN, optional)',
    'customContent.editor.backgroundForm.skillsLegend': 'Skill proficiencies',
    'customContent.editor.backgroundForm.skillsHelper':
      'Pick the skills the background grants (click to toggle).',
    'customContent.editor.backgroundForm.toolsLegend': 'Tool proficiencies',
    'customContent.editor.backgroundForm.toolsHelper':
      'Tool identifiers (e.g. thieves-tools, calligraphers-supplies). One per row.',
    'customContent.editor.backgroundForm.toolsEmpty': 'No tools yet.',
    'customContent.editor.backgroundForm.toolAdd': 'Tool identifier',
    'customContent.editor.backgroundForm.toolAddPlaceholder':
      'e.g. thieves-tools',
    'customContent.editor.backgroundForm.toolAddButton': 'Add',
    'customContent.editor.backgroundForm.languages': 'Bonus languages',
    'customContent.editor.backgroundForm.languagesHelper':
      'Number of bonus languages the PC picks at creation (0 if none).',
    'customContent.editor.backgroundForm.equipmentLegend': 'Starting equipment',
    'customContent.editor.backgroundForm.equipmentHelper':
      'Each row references an item from the base (items.json) — no free strings.',
    'customContent.editor.backgroundForm.equipmentEmpty': 'No equipment yet.',
    'customContent.editor.backgroundForm.equipmentAdd': 'Add equipment',
    'customContent.editor.backgroundForm.equipmentItemId': 'Item',
    'customContent.editor.backgroundForm.equipmentItemIdPlaceholder':
      'Pick an item…',
    'customContent.editor.backgroundForm.equipmentItemIdLoading':
      'Loading items…',
    'customContent.editor.backgroundForm.equipmentQty': 'Quantity',
    'customContent.editor.backgroundForm.coinsLegend': 'Starting coins',
    'customContent.editor.backgroundForm.coinsToggle':
      'Background grants coins',
    'customContent.editor.backgroundForm.coinsQty': 'Quantity',
    'customContent.editor.backgroundForm.coinsUnit': 'Unit',
    'customContent.editor.backgroundForm.coinUnit.cp': 'cp (copper)',
    'customContent.editor.backgroundForm.coinUnit.sp': 'sp (silver)',
    'customContent.editor.backgroundForm.coinUnit.ep': 'ep (electrum)',
    'customContent.editor.backgroundForm.coinUnit.gp': 'gp (gold)',
    'customContent.editor.backgroundForm.coinUnit.pp': 'pp (platinum)',
    'customContent.editor.backgroundForm.featureLegend': 'Granted feature',
    'customContent.editor.backgroundForm.featureHelper':
      'Special capability the background grants the PC.',
    'customContent.editor.backgroundForm.featureNameFr': 'Feature name (FR)',
    'customContent.editor.backgroundForm.featureNameEn':
      'Feature name (EN, optional)',
    'customContent.editor.backgroundForm.featureDescriptionFr':
      'Feature description (FR)',
    'customContent.editor.backgroundForm.featureDescriptionEn':
      'Feature description (EN, optional)',
    'customContent.editor.backgroundForm.removeRow': 'Remove',
    'customContent.editor.backgroundForm.cancel': 'Cancel',
    'customContent.editor.backgroundForm.confirm': 'Confirm background',
    'customContent.editor.backgroundForm.error.idRequired':
      'Identifier is required.',
    'customContent.editor.backgroundForm.error.idFormat':
      'Identifier must be kebab-case (lowercase letters, digits, hyphens).',
    'customContent.editor.backgroundForm.error.nameFrRequired':
      'Name (FR) is required.',
    'customContent.editor.backgroundForm.error.descriptionFrRequired':
      'Description (FR) is required.',
    'customContent.editor.backgroundForm.error.featureNameFrRequired':
      'Feature name (FR) is required.',
    'customContent.editor.backgroundForm.error.featureDescriptionFrRequired':
      'Feature description (FR) is required.',
    'customContent.editor.backgroundForm.error.equipmentItemIdRequired':
      'Each equipment row must pick an item (otherwise it is ignored).',
    'customContent.editor.backgroundForm.error.equipmentDuplicate':
      'The same item cannot appear twice — sum the quantities instead.',
    'customContent.editor.backgroundForm.error.equipmentQtyInvalid':
      'Quantity must be a positive integer.',
    'customContent.editor.subclassForm.title': 'New subclass',
    'customContent.editor.subclassForm.id': 'Subclass identifier',
    'customContent.editor.subclassForm.idHelper':
      'kebab-case, unique within the pack.',
    'customContent.editor.subclassForm.classId': 'Parent class',
    'customContent.editor.subclassForm.classIdHelper':
      'Pick the parent class (SRD or an already-imported pack).',
    'customContent.editor.subclassForm.classIdPlaceholder': 'Pick a class…',
    'customContent.editor.subclassForm.classIdLoading': 'Loading classes…',
    'customContent.editor.subclassForm.nameFr': 'Name (FR)',
    'customContent.editor.subclassForm.nameEn': 'Name (EN, optional)',
    'customContent.editor.subclassForm.descriptionFr': 'Description (FR)',
    'customContent.editor.subclassForm.descriptionEn':
      'Description (EN, optional)',
    'customContent.editor.subclassForm.featuresLegend': 'Features by level',
    'customContent.editor.subclassForm.featuresHelper':
      'One row per feature gained. Level (1-20), name, and description.',
    'customContent.editor.subclassForm.featuresEmpty': 'No features yet.',
    'customContent.editor.subclassForm.featureAdd': 'Add a feature',
    'customContent.editor.subclassForm.featureLevel': 'Level',
    'customContent.editor.subclassForm.featureNameFr': 'Feature name (FR)',
    'customContent.editor.subclassForm.featureNameEn':
      'Feature name (EN, optional)',
    'customContent.editor.subclassForm.featureDescriptionFr':
      'Feature description (FR)',
    'customContent.editor.subclassForm.featureDescriptionEn':
      'Feature description (EN, optional)',
    'customContent.editor.subclassForm.removeRow': 'Remove',
    'customContent.editor.subclassForm.cancel': 'Cancel',
    'customContent.editor.subclassForm.confirm': 'Confirm subclass',
    'customContent.editor.subclassForm.error.idRequired':
      'Identifier is required.',
    'customContent.editor.subclassForm.error.idFormat':
      'Identifier must be kebab-case (lowercase letters, digits, hyphens).',
    'customContent.editor.subclassForm.error.classIdRequired':
      'Pick the parent class.',
    'customContent.editor.subclassForm.error.nameFrRequired':
      'Name (FR) is required.',
    'customContent.editor.subclassForm.error.descriptionFrRequired':
      'Description (FR) is required.',
    'customContent.editor.subclassForm.error.featureIncomplete':
      'Each feature needs a name (FR) and a description (FR).',
    'customContent.editor.subclassForm.error.featureDuplicate':
      'The same (level + name) feature cannot appear twice.',
    'customContent.editor.spellForm.title': 'New spell',
    'customContent.editor.spellForm.id': 'Spell identifier',
    'customContent.editor.spellForm.idHelper':
      'Kebab-case, unique within the pack (e.g. arcanian-fireball).',
    'customContent.editor.spellForm.nameFr': 'Name (FR)',
    'customContent.editor.spellForm.nameEn': 'Name (EN, optional)',
    'customContent.editor.spellForm.level': 'Level',
    'customContent.editor.spellForm.levelHelper':
      '0 = cantrip. 1-9 for slot-based spells.',
    'customContent.editor.spellForm.school': 'School',
    'customContent.editor.spellForm.schoolPlaceholder': 'Pick a school…',
    'customContent.editor.spellForm.castingTimeFr': 'Casting time (FR)',
    'customContent.editor.spellForm.castingTimeEn':
      'Casting time (EN, optional)',
    'customContent.editor.spellForm.castingTimeHelper':
      'E.g. "1 action", "1 bonus action", "1 minute".',
    'customContent.editor.spellForm.rangeFr': 'Range (FR)',
    'customContent.editor.spellForm.rangeEn': 'Range (EN, optional)',
    'customContent.editor.spellForm.rangeHelper':
      'E.g. "Self", "Touch", "60 feet".',
    'customContent.editor.spellForm.durationFr': 'Duration (FR)',
    'customContent.editor.spellForm.durationEn': 'Duration (EN, optional)',
    'customContent.editor.spellForm.durationHelper':
      'E.g. "Instantaneous", "1 minute", "24 hours".',
    'customContent.editor.spellForm.componentsLegend': 'Components',
    'customContent.editor.spellForm.componentsHelper':
      'Toggle V (verbal), S (somatic) or M (material). A spell may combine multiple.',
    'customContent.editor.spellForm.componentV': 'V (verbal)',
    'customContent.editor.spellForm.componentS': 'S (somatic)',
    'customContent.editor.spellForm.componentM': 'M (material)',
    'customContent.editor.spellForm.materialFr': 'Material component (FR)',
    'customContent.editor.spellForm.materialEn':
      'Material component (EN, optional)',
    'customContent.editor.spellForm.materialHelper':
      'E.g. "a pearl worth 100 gp" or "a candle".',
    'customContent.editor.spellForm.concentration': 'Concentration',
    'customContent.editor.spellForm.concentrationHelper':
      'The spell needs concentration to last.',
    'customContent.editor.spellForm.ritual': 'Ritual',
    'customContent.editor.spellForm.ritualHelper':
      'The spell can be cast as a 10-minute ritual without a slot.',
    'customContent.editor.spellForm.descriptionFr': 'Description (FR)',
    'customContent.editor.spellForm.descriptionEn':
      'Description (EN, optional)',
    'customContent.editor.spellForm.descriptionHelper':
      'Full spell effect as it will appear on the sheet.',
    'customContent.editor.spellForm.hasAtHigherLevels':
      'Effects at higher levels',
    'customContent.editor.spellForm.hasAtHigherLevelsHelper':
      'Toggle if the spell scales when cast with a higher slot.',
    'customContent.editor.spellForm.atHigherLevelsFr': 'At higher levels (FR)',
    'customContent.editor.spellForm.atHigherLevelsEn':
      'At higher levels (EN, optional)',
    'customContent.editor.spellForm.classesLegend': 'Classes',
    'customContent.editor.spellForm.classesHelper':
      'Which classes have access to this spell. At least one is recommended so it surfaces in the wizard.',
    'customContent.editor.spellForm.classesLoading': 'Loading classes…',
    'customContent.editor.spellForm.classesEmpty':
      'No classes available — check that the SRD bundle loaded.',
    'customContent.editor.spellForm.damageLegend': 'Damage',
    'customContent.editor.spellForm.damageHelper':
      'Optional — utility or control spells may have no damage row.',
    'customContent.editor.spellForm.damageEmpty': 'No damage yet.',
    'customContent.editor.spellForm.damageAdd': 'Add a damage row',
    'customContent.editor.spellForm.damageFormula': 'Formula (dice)',
    'customContent.editor.spellForm.damageFormulaPlaceholder': 'e.g. 8d6',
    'customContent.editor.spellForm.damageType': 'Damage type',
    'customContent.editor.spellForm.damageTypeLabelFr': 'Display label (FR)',
    'customContent.editor.spellForm.damageTypeLabelEn':
      'Display label (EN, optional)',
    'customContent.editor.spellForm.damageHasUpcast':
      'Effects at higher levels',
    'customContent.editor.spellForm.damageHasUpcastHelper':
      'How much the formula grows per slot above the base level.',
    'customContent.editor.spellForm.damageUpcastPerLevel':
      'Dice added per higher slot',
    'customContent.editor.spellForm.damageUpcastPerLevelHelper':
      'E.g. "+1d6" per slot above the base level.',
    'customContent.editor.spellForm.damageUpcastPerLevelPlaceholder':
      'e.g. +1d6',
    'customContent.editor.spellForm.removeRow': 'Remove',
    'customContent.editor.spellForm.cancel': 'Cancel',
    'customContent.editor.spellForm.confirm': 'Confirm spell',
    'customContent.editor.spellForm.error.idRequired':
      'Identifier is required.',
    'customContent.editor.spellForm.error.idFormat':
      'Identifier must be kebab-case (lowercase letters, digits, hyphens).',
    'customContent.editor.spellForm.error.nameFrRequired':
      'Name (FR) is required.',
    'customContent.editor.spellForm.error.schoolRequired': 'Pick a school.',
    'customContent.editor.spellForm.error.castingTimeFrRequired':
      'Casting time (FR) is required.',
    'customContent.editor.spellForm.error.rangeFrRequired':
      'Range (FR) is required.',
    'customContent.editor.spellForm.error.durationFrRequired':
      'Duration (FR) is required.',
    'customContent.editor.spellForm.error.descriptionFrRequired':
      'Description (FR) is required.',
    'customContent.editor.spellForm.error.materialFrRequired':
      'Describe the material component (FR) when M is toggled on.',
    'customContent.editor.spellForm.error.atHigherLevelsFrRequired':
      'Describe the effect (FR) at higher levels or untoggle the checkbox.',
    'customContent.editor.spellForm.error.damageIncomplete':
      'Each damage row needs a formula and a label (FR).',
    'customContent.editor.spellForm.error.damageDuplicate':
      'The same damage type cannot appear twice — merge the formulas.',
    // Items
    'customContent.editor.items.add': 'Add an item',
    'customContent.editor.items.empty': 'No item added yet.',
    'customContent.editor.items.remove': 'Remove',
    'customContent.editor.itemForm.title': 'New item',
    'customContent.editor.itemForm.id': 'Item identifier',
    'customContent.editor.itemForm.idHelper':
      'kebab-case, unique within the pack.',
    'customContent.editor.itemForm.nameFr': 'Name (FR)',
    'customContent.editor.itemForm.nameEn': 'Name (EN, optional)',
    'customContent.editor.itemForm.category': 'Category',
    'customContent.editor.itemForm.categoryPlaceholder': 'Pick a category…',
    'customContent.editor.itemForm.hasCost': 'Cost listed',
    'customContent.editor.itemForm.hasCostHelper':
      'Check if the item has a market price. Otherwise leave blank.',
    'customContent.editor.itemForm.costQty': 'Quantity',
    'customContent.editor.itemForm.costUnit': 'Currency',
    'customContent.editor.itemForm.costUnitPlaceholder': 'Pick a currency…',
    'customContent.editor.itemForm.weight': 'Weight (pounds)',
    'customContent.editor.itemForm.weightHelper':
      '0 if negligible. 1 lb ≈ 0.5 kg.',
    'customContent.editor.itemForm.hasDescription': 'Rich description',
    'customContent.editor.itemForm.hasDescriptionHelper':
      'Check to add a long description.',
    'customContent.editor.itemForm.descriptionFr': 'Description (FR)',
    'customContent.editor.itemForm.descriptionEn':
      'Description (EN, optional)',
    'customContent.editor.itemForm.descriptionHelper':
      'Sentence or paragraph shown in the item detail.',
    'customContent.editor.itemForm.weaponLegend': 'Weapon',
    'customContent.editor.itemForm.weaponHelper':
      'Weapon-only fields — damage, properties, range, mastery.',
    'customContent.editor.itemForm.hasDamage': 'Damage listed',
    'customContent.editor.itemForm.hasDamageHelper':
      'Check to set a damage formula (most weapons do).',
    'customContent.editor.itemForm.damageDice': 'Damage dice',
    'customContent.editor.itemForm.damageDicePlaceholder': 'e.g. 1d8',
    'customContent.editor.itemForm.damageType': 'Damage type',
    'customContent.editor.itemForm.damageTypeLabelFr': 'Display label (FR)',
    'customContent.editor.itemForm.damageTypeLabelEn':
      'Display label (EN, optional)',
    'customContent.editor.itemForm.hasRange': 'Ranged or thrown',
    'customContent.editor.itemForm.hasRangeHelper':
      'Check for ranged weapons or those with a range value.',
    'customContent.editor.itemForm.rangeNormal': 'Normal range (ft)',
    'customContent.editor.itemForm.rangeMax': 'Max range (ft)',
    'customContent.editor.itemForm.rangeHelper':
      'Beyond normal range, the attack is at disadvantage.',
    'customContent.editor.itemForm.hasMastery': 'Mastery property',
    'customContent.editor.itemForm.hasMasteryHelper':
      'Check to assign a Weapon Mastery property (Cleave, Graze, Nick…).',
    'customContent.editor.itemForm.masteryProperty': 'Mastery property',
    'customContent.editor.itemForm.masteryPlaceholder': 'Pick a mastery…',
    'customContent.editor.itemForm.propertiesLegend': 'Properties',
    'customContent.editor.itemForm.propertiesHelper':
      'Free keywords (e.g. "finesse", "heavy", "versatile").',
    'customContent.editor.itemForm.propertyAdd': 'Add a property',
    'customContent.editor.itemForm.propertyPlaceholder': 'e.g. finesse',
    'customContent.editor.itemForm.propertyEmpty': 'No property yet.',
    'customContent.editor.itemForm.armorLegend': 'Armor',
    'customContent.editor.itemForm.armorHelper':
      'Armor and shield fields — base AC, Dex limit, Strength required, stealth.',
    'customContent.editor.itemForm.acBase': 'Base AC',
    'customContent.editor.itemForm.acBaseHelper':
      'e.g. 11 for leather, 16 for chain mail. Use +2 for a shield (it adds, it does not set).',
    'customContent.editor.itemForm.hasAcDexMax': 'Dex bonus cap',
    'customContent.editor.itemForm.hasAcDexMaxHelper':
      'Check if the armor caps Dex bonus to AC. Leave unchecked for light armor.',
    'customContent.editor.itemForm.acDexMax': 'Max Dex bonus',
    'customContent.editor.itemForm.acDexMaxHelper':
      '0 for heavy armor (no Dex), 2 for medium armor.',
    'customContent.editor.itemForm.hasStrRequired': 'Strength required',
    'customContent.editor.itemForm.hasStrRequiredHelper':
      'Check if wearing the armor requires a minimum Strength score.',
    'customContent.editor.itemForm.strRequired': 'Minimum Strength score',
    'customContent.editor.itemForm.stealthDisadvantage':
      'Stealth disadvantage',
    'customContent.editor.itemForm.stealthDisadvantageHelper':
      'Check if the armor imposes disadvantage on Dex (Stealth) checks.',
    'customContent.editor.itemForm.removeRow': 'Remove',
    'customContent.editor.itemForm.cancel': 'Cancel',
    'customContent.editor.itemForm.confirm': 'Confirm item',
    'customContent.editor.itemForm.error.idRequired': 'Identifier is required.',
    'customContent.editor.itemForm.error.idFormat':
      'Identifier must be kebab-case (lowercase, digits, hyphens).',
    'customContent.editor.itemForm.error.nameFrRequired':
      'Name (FR) is required.',
    'customContent.editor.itemForm.error.categoryRequired': 'Pick a category.',
    'customContent.editor.itemForm.error.weightNegative':
      'Weight cannot be negative.',
    'customContent.editor.itemForm.error.costQtyNegative':
      'Cost quantity cannot be negative.',
    'customContent.editor.itemForm.error.descriptionFrRequired':
      'Describe the item (FR) or untoggle rich description.',
    'customContent.editor.itemForm.error.damageDiceRequired':
      'Provide the damage dice (e.g. 1d8) or untoggle damage.',
    'customContent.editor.itemForm.error.damageTypeLabelFrRequired':
      'Provide the damage type label (FR).',
    'customContent.editor.itemForm.error.rangeNormalRequired':
      'Provide normal range in feet.',
    'customContent.editor.itemForm.error.rangeMaxLessThanNormal':
      'Max range must be ≥ normal range.',
    'customContent.editor.itemForm.error.acBaseRequired':
      'Base AC is required for armor or shield.',
    'customContent.editor.itemForm.error.strRequiredRequired':
      'Provide the minimum Strength score or uncheck the box.',
    'customContent.editor.itemForm.error.propertyDuplicate':
      'This property is already listed.',
    'customContent.editor.itemForm.error.propertyEmpty':
      'Type a non-empty keyword.',
    // Ancestry — pack editor (JALON 3C.8)
    'customContent.editor.ancestries.add': 'Add an ancestry',
    'customContent.editor.ancestries.empty': 'No ancestry added yet.',
    'customContent.editor.ancestries.remove': 'Remove',
    'customContent.editor.ancestryForm.title': 'New ancestry',
    'customContent.editor.ancestryForm.id': 'Identifier',
    'customContent.editor.ancestryForm.idHelper':
      'Lowercase slug, digits and dashes (e.g. “mist-people”). Avoid official ancestry slugs (dragonborn, elf, gnome, goliath, human, tiefling).',
    'customContent.editor.ancestryForm.nameFr': 'Name (FR)',
    'customContent.editor.ancestryForm.nameEn': 'Name (EN)',
    'customContent.editor.ancestryForm.size': 'Size',
    'customContent.editor.ancestryForm.speed': 'Speed (squares)',
    'customContent.editor.ancestryForm.speedHelper':
      'Base walking speed in 5-ft / 1.5 m squares.',
    'customContent.editor.ancestryForm.descriptionFr': 'Description (FR)',
    'customContent.editor.ancestryForm.descriptionEn': 'Description (EN)',
    'customContent.editor.ancestryForm.asisLegend': 'Ability score increases',
    'customContent.editor.ancestryForm.asisHelper':
      'Add one or more ability bonuses (one per ability at most).',
    'customContent.editor.ancestryForm.asisEmpty': 'No bonus added yet.',
    'customContent.editor.ancestryForm.asiAbility': 'Ability',
    'customContent.editor.ancestryForm.asiAbilityPlaceholder':
      'Pick an ability',
    'customContent.editor.ancestryForm.asiBonus': 'Bonus',
    'customContent.editor.ancestryForm.asiAdd': 'Add bonus',
    'customContent.editor.ancestryForm.traitsLegend': 'Racial traits',
    'customContent.editor.ancestryForm.traitsHelper':
      'Each trait has a name and a description. At least one trait is recommended.',
    'customContent.editor.ancestryForm.traitsEmpty': 'No trait added yet.',
    'customContent.editor.ancestryForm.traitNameFr': 'Trait name (FR)',
    'customContent.editor.ancestryForm.traitNameEn': 'Trait name (EN)',
    'customContent.editor.ancestryForm.traitDescriptionFr':
      'Trait description (FR)',
    'customContent.editor.ancestryForm.traitDescriptionEn':
      'Trait description (EN)',
    'customContent.editor.ancestryForm.traitAdd': 'Add trait',
    'customContent.editor.ancestryForm.languagesLegend': 'Languages',
    'customContent.editor.ancestryForm.languagesHelper':
      'Languages spoken from level 1. Type a language name then confirm.',
    'customContent.editor.ancestryForm.languagesEmpty': 'No language added yet.',
    'customContent.editor.ancestryForm.languageAdd': 'New language',
    'customContent.editor.ancestryForm.languageAddPlaceholder':
      'e.g. common, elvish, draconic…',
    'customContent.editor.ancestryForm.languageAddButton': 'Add',
    'customContent.editor.ancestryForm.commonSpellsLegend':
      'Ancestry spells',
    'customContent.editor.ancestryForm.commonSpellsHelper':
      'Spells known by the whole ancestry (multi-select among available spells).',
    'customContent.editor.ancestryForm.commonSpellsLoading':
      'Loading spells…',
    'customContent.editor.ancestryForm.commonSpellsEmpty':
      'No spell available — import a pack containing spells to associate some.',
    'customContent.editor.ancestryForm.dragonLegend':
      'Draconic ancestors (optional)',
    'customContent.editor.ancestryForm.dragonHelper':
      'For draconic ancestries: associate a damage type with a named ancestor. Skip if the ancestry is not draconic.',
    'customContent.editor.ancestryForm.dragonEmpty':
      'No draconic ancestor added.',
    'customContent.editor.ancestryForm.dragonAdd': 'Add ancestor',
    'customContent.editor.ancestryForm.dragonOptionId': 'Identifier',
    'customContent.editor.ancestryForm.dragonOptionIdPlaceholder':
      'e.g. frost-ancestor',
    'customContent.editor.ancestryForm.dragonOptionNameFr': 'Name (FR)',
    'customContent.editor.ancestryForm.dragonOptionNameEn': 'Name (EN)',
    'customContent.editor.ancestryForm.dragonOptionDamageType': 'Damage type',
    'customContent.editor.ancestryForm.dragonOptionDamageLabelFr':
      'FR damage label',
    'customContent.editor.ancestryForm.dragonOptionDamageLabelEn':
      'EN damage label',
    'customContent.editor.ancestryForm.giantLegend':
      'Giant ancestors (optional)',
    'customContent.editor.ancestryForm.giantHelper':
      'For giant ancestries: associate an effect with a named ancestor type. Skip if the ancestry is not a giant ancestry.',
    'customContent.editor.ancestryForm.giantEmpty': 'No giant ancestor added.',
    'customContent.editor.ancestryForm.giantAdd': 'Add ancestor',
    'customContent.editor.ancestryForm.giantOptionId': 'Identifier',
    'customContent.editor.ancestryForm.giantOptionIdPlaceholder':
      'e.g. stone-ancestor',
    'customContent.editor.ancestryForm.giantOptionNameFr': 'Name (FR)',
    'customContent.editor.ancestryForm.giantOptionNameEn': 'Name (EN)',
    'customContent.editor.ancestryForm.giantOptionEffectFr': 'Effect (FR)',
    'customContent.editor.ancestryForm.giantOptionEffectEn': 'Effect (EN)',
    'customContent.editor.ancestryForm.removeRow': 'Remove',
    'customContent.editor.ancestryForm.cancel': 'Cancel',
    'customContent.editor.ancestryForm.confirm': 'Add ancestry',
    'customContent.editor.ancestryForm.error.idRequired':
      'Identifier is required.',
    'customContent.editor.ancestryForm.error.idFormat':
      'Invalid slug: lowercase, digits and dashes only.',
    'customContent.editor.ancestryForm.error.idReserved':
      'This identifier is reserved for official ancestries — use a slug specific to your creation.',
    'customContent.editor.ancestryForm.error.nameFrRequired':
      'FR name is required.',
    'customContent.editor.ancestryForm.error.descriptionFrRequired':
      'FR description is required.',
    'customContent.editor.ancestryForm.error.speedPositive':
      'Speed must be strictly positive.',
    'customContent.editor.ancestryForm.error.asiAbilityRequired':
      'Each row must target an ability.',
    'customContent.editor.ancestryForm.error.asiDuplicate':
      'An ability can only be boosted once.',
    'customContent.editor.ancestryForm.error.traitIncomplete':
      'Each trait needs an FR name and an FR description.',
    'customContent.editor.ancestryForm.error.dragonIncomplete':
      'Each draconic ancestor needs an identifier, an FR name and an FR damage label.',
    'customContent.editor.ancestryForm.error.dragonIdFormat':
      'Invalid draconic ancestor identifier: lowercase, digits and dashes only.',
    'customContent.editor.ancestryForm.error.dragonDuplicate':
      'Two draconic ancestors share the same identifier.',
    'customContent.editor.ancestryForm.error.giantIncomplete':
      'Each giant ancestor needs an identifier, an FR name and an FR effect.',
    'customContent.editor.ancestryForm.error.giantIdFormat':
      'Invalid giant ancestor identifier: lowercase, digits and dashes only.',
    'customContent.editor.ancestryForm.error.giantDuplicate':
      'Two giant ancestors share the same identifier.',
    // Class — pack editor (JALON 3C.9)
    'customContent.editor.classes.add': 'Add a class',
    'customContent.editor.classes.empty': 'No class added yet.',
    'customContent.editor.classes.remove': 'Remove',
    'customContent.editor.classForm.title': 'New class',
    'customContent.editor.classForm.intro':
      'Simple form for a homebrew class. For a complex class (L2-L20 table, L1 sub-choices like Divine Order, Weapon Mastery), edit the JSON after export.',
    'customContent.editor.classForm.id': 'Identifier',
    'customContent.editor.classForm.idHelper':
      'Lowercase slug, digits and dashes (e.g. "ash-pact"). Avoid the 12 official class slugs.',
    'customContent.editor.classForm.nameFr': 'Name (FR)',
    'customContent.editor.classForm.nameEn': 'Name (EN)',
    'customContent.editor.classForm.descriptionFr': 'Description (FR)',
    'customContent.editor.classForm.descriptionEn': 'Description (EN)',
    'customContent.editor.classForm.hitDie': 'Hit die',
    'customContent.editor.classForm.hitDieHelper':
      'Die rolled on level up to gain hit points.',
    'customContent.editor.classForm.primaryAbilityLegend': 'Primary ability',
    'customContent.editor.classForm.primaryAbilityHelper':
      'Ability used for attack rolls and spell save DC. Select at least one.',
    'customContent.editor.classForm.saveProficienciesLegend':
      'Saving throw proficiencies',
    'customContent.editor.classForm.saveProficienciesHelper':
      'Saving throws this class is trained in (two for SRD classes).',
    'customContent.editor.classForm.skillChoicesLegend': 'Skill choices',
    'customContent.editor.classForm.skillChoicesHelper':
      'At level 1, the player picks N skills from a list.',
    'customContent.editor.classForm.skillChoiceCount': 'Pick count',
    'customContent.editor.classForm.skillChoiceFrom': 'Available skills',
    'customContent.editor.classForm.skillChoiceFromHelper':
      'Add eligible skills one by one. The list must contain at least as many entries as the pick count.',
    'customContent.editor.classForm.skillChoiceFromPlaceholder':
      'E.g. athletics, perception, intimidation…',
    'customContent.editor.classForm.skillChoiceFromEmpty':
      'No skill listed yet.',
    'customContent.editor.classForm.armorProficiencies':
      'Armor proficiencies',
    'customContent.editor.classForm.armorProficienciesHelper':
      'E.g. light, medium, heavy armor, shields.',
    'customContent.editor.classForm.armorProficienciesPlaceholder':
      'E.g. light armor, shields…',
    'customContent.editor.classForm.armorProficienciesEmpty':
      'No armor proficiency yet.',
    'customContent.editor.classForm.weaponProficiencies':
      'Weapon proficiencies',
    'customContent.editor.classForm.weaponProficienciesHelper':
      'E.g. simple weapons, martial weapons, or a specific list.',
    'customContent.editor.classForm.weaponProficienciesPlaceholder':
      'E.g. simple weapons, martial weapons…',
    'customContent.editor.classForm.weaponProficienciesEmpty':
      'No weapon proficiency yet.',
    'customContent.editor.classForm.toolProficiencies': 'Tool proficiencies',
    'customContent.editor.classForm.toolProficienciesHelper':
      'E.g. artisan tools, musical instrument.',
    'customContent.editor.classForm.toolProficienciesPlaceholder':
      'E.g. thieves’ tools, musical instrument…',
    'customContent.editor.classForm.toolProficienciesEmpty':
      'No tool proficiency yet.',
    'customContent.editor.classForm.chipAdd': 'Add',
    'customContent.editor.classForm.chipInputLabel': 'New value',
    'customContent.editor.classForm.spellcastingLegend': 'Spellcasting',
    'customContent.editor.classForm.spellcastingHelper':
      'Enable if the class casts spells. Sets the spellcasting ability and progression speed.',
    'customContent.editor.classForm.spellcastingToggle':
      'This class casts spells',
    'customContent.editor.classForm.spellcastingAbility': 'Spellcasting ability',
    'customContent.editor.classForm.spellcastingProgression':
      'Progression speed',
    'customContent.editor.classForm.spellcastingProgression.full':
      'Full caster',
    'customContent.editor.classForm.spellcastingProgression.half':
      'Half caster',
    'customContent.editor.classForm.spellcastingProgression.third':
      'Third caster',
    'customContent.editor.classForm.spellcastingProgression.pact':
      'Pact magic',
    'customContent.editor.classForm.startingEquipmentLegend':
      'Starting equipment',
    'customContent.editor.classForm.startingEquipmentHelper':
      'A single V1 option. References item `id`s (pack or SRD). Optional coins below.',
    'customContent.editor.classForm.startingItemsEmpty':
      'No starting item yet.',
    'customContent.editor.classForm.startingItemAdd': 'Add an item',
    'customContent.editor.classForm.startingItemId': 'Item identifier',
    'customContent.editor.classForm.startingItemIdPlaceholder':
      'E.g. sword-longsword, kit-explorer…',
    'customContent.editor.classForm.startingItemQty': 'Quantity',
    'customContent.editor.classForm.startingCoinsToggle':
      'Add starting coins',
    'customContent.editor.classForm.startingCoinsQty': 'Quantity',
    'customContent.editor.classForm.startingCoinsUnit': 'Unit',
    'customContent.editor.classForm.featuresLegend': 'Class features',
    'customContent.editor.classForm.featuresHelper':
      'Add features by level. For a full L2-L20 table, edit the JSON after export.',
    'customContent.editor.classForm.featuresEmpty': 'No feature added yet.',
    'customContent.editor.classForm.featureAdd': 'Add a feature',
    'customContent.editor.classForm.featureLevel': 'Level',
    'customContent.editor.classForm.featureNameFr': 'Feature name (FR)',
    'customContent.editor.classForm.featureNameEn': 'Feature name (EN)',
    'customContent.editor.classForm.featureDescriptionFr':
      'Description (FR)',
    'customContent.editor.classForm.featureDescriptionEn':
      'Description (EN)',
    'customContent.editor.classForm.multiclassLegend': 'Multiclassing',
    'customContent.editor.classForm.multiclassHelper':
      'Prerequisites and proficiencies gained when this class is added in multiclass.',
    'customContent.editor.classForm.multiclassToggle':
      'This class has multiclass prerequisites',
    'customContent.editor.classForm.multiclassCombinator': 'Combination',
    'customContent.editor.classForm.multiclassCombinatorAnd':
      'All conditions (AND)',
    'customContent.editor.classForm.multiclassCombinatorOr':
      'At least one (OR)',
    'customContent.editor.classForm.multiclassMinimaEmpty':
      'No minimum yet — add a prerequisite to gate this class in multiclass.',
    'customContent.editor.classForm.multiclassMinAdd':
      'Add a prerequisite',
    'customContent.editor.classForm.multiclassMinAbility': 'Ability',
    'customContent.editor.classForm.multiclassMinAbilityPlaceholder':
      'Pick an ability',
    'customContent.editor.classForm.multiclassMinValue': 'Minimum',
    'customContent.editor.classForm.multiclassArmor':
      'Armor gained on multiclass',
    'customContent.editor.classForm.multiclassArmorHelper':
      'Armor proficiencies a character gains when taking a level in this class as multiclass.',
    'customContent.editor.classForm.multiclassArmorPlaceholder':
      'E.g. light armor, shields…',
    'customContent.editor.classForm.multiclassArmorEmpty':
      'No armor gained on multiclass.',
    'customContent.editor.classForm.multiclassWeapons':
      'Weapons gained on multiclass',
    'customContent.editor.classForm.multiclassWeaponsHelper':
      'Weapon proficiencies a character gains when taking a level in this class as multiclass.',
    'customContent.editor.classForm.multiclassWeaponsPlaceholder':
      'E.g. simple weapons…',
    'customContent.editor.classForm.multiclassWeaponsEmpty':
      'No weapon gained on multiclass.',
    'customContent.editor.classForm.multiclassTools':
      'Tools gained on multiclass',
    'customContent.editor.classForm.multiclassToolsHelper':
      'Tool proficiencies a character gains when taking a level in this class as multiclass.',
    'customContent.editor.classForm.multiclassToolsPlaceholder':
      'E.g. artisan tools…',
    'customContent.editor.classForm.multiclassToolsEmpty':
      'No tool gained on multiclass.',
    'customContent.editor.classForm.removeRow': 'Remove',
    'customContent.editor.classForm.cancel': 'Cancel',
    'customContent.editor.classForm.confirm': 'Add the class',
    'customContent.editor.classForm.error.idRequired':
      'Identifier is required.',
    'customContent.editor.classForm.error.idFormat':
      'Invalid slug: lowercase, digits and dashes only.',
    'customContent.editor.classForm.error.idReserved':
      'This identifier is reserved by an official class — pick a slug unique to your homebrew.',
    'customContent.editor.classForm.error.nameFrRequired':
      'FR name is required.',
    'customContent.editor.classForm.error.descriptionFrRequired':
      'FR description is required.',
    'customContent.editor.classForm.error.primaryAbilityRequired':
      'Pick at least one primary ability.',
    'customContent.editor.classForm.error.saveProficienciesRequired':
      'Pick at least one saving throw proficiency.',
    'customContent.editor.classForm.error.skillChoiceCountInvalid':
      'Skill choice count must be ≥ 0.',
    'customContent.editor.classForm.error.skillChoiceFromTooShort':
      'The available skills list must contain at least the pick count.',
    'customContent.editor.classForm.error.featureIncomplete':
      'Each feature needs a level (1-20), an FR name and an FR description.',
    'customContent.editor.classForm.error.coinsInvalid':
      'Coin quantity must be a positive integer.',
    'customContent.editor.classForm.error.startingItemIdFormat':
      'Invalid item identifier: lowercase, digits and dashes only.',
    'customContent.editor.classForm.error.startingItemQtyInvalid':
      'Quantity must be strictly positive.',
    'customContent.editor.classForm.error.multiclassMinimumRequired':
      'Add at least one ability minimum.',
    'customContent.editor.classForm.error.multiclassMinimumAbilityRequired':
      'Each prerequisite must target an ability.',
    'customContent.editor.classForm.error.multiclassMinimumDuplicate':
      'An ability cannot appear twice in prerequisites.',
    'customContent.editor.classForm.error.multiclassMinimumOutOfRange':
      'Minimum must be between 1 and 20.',
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
