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
  // Alignements (2 axes : loi/chaos × bien/mal)
  | 'alignment.LB'
  | 'alignment.NB'
  | 'alignment.CB'
  | 'alignment.LN'
  | 'alignment.N'
  | 'alignment.CN'
  | 'alignment.LM'
  | 'alignment.NM'
  | 'alignment.CM'
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
  // Codex — navigateur de contenu SRD (plan 19)
  | 'codex.title'
  | 'codex.subtitle'
  // Codex en superposition — consultation sans quitter la fiche / la rencontre
  | 'codex.overlay.subtitle'
  | 'codex.overlay.close'
  | 'codex.nav.cta'
  | 'codex.loading'
  | 'codex.empty'
  | 'codex.result.singular'
  | 'codex.result.plural'
  | 'codex.cat.aria'
  | 'codex.cat.search'
  | 'codex.search.all'
  | 'codex.search.allHint'
  | 'codex.cat.spells'
  | 'codex.cat.feats'
  | 'codex.cat.invocations'
  | 'codex.cat.conditions'
  | 'codex.cat.magicItems'
  | 'codex.cat.items'
  | 'codex.cat.monsters'
  | 'codex.search.monsters'
  | 'codex.monster.allSizes'
  | 'codex.monster.senses'
  | 'codex.cat.ancestries'
  | 'codex.cat.backgrounds'
  | 'codex.cat.classes'
  | 'codex.search.spells'
  | 'codex.search.feats'
  | 'codex.search.invocations'
  | 'codex.search.conditions'
  | 'codex.search.magicItems'
  | 'codex.search.items'
  | 'codex.search.ancestries'
  | 'codex.search.backgrounds'
  | 'codex.search.classes'
  | 'codex.detail.prerequisite'
  | 'codex.detail.prereqLevel'
  | 'codex.spell.allLevels'
  | 'codex.spell.allSchools'
  | 'codex.spell.classesLabel'
  | 'codex.item.allRarities'
  | 'codex.item.allCategories'
  | 'codex.item.weight'
  | 'codex.item.cost'
  | 'codex.item.damage'
  | 'codex.item.ac'
  | 'codex.item.properties'
  | 'codex.item.attunement'
  | 'codex.item.attunementRequired'
  | 'codex.species.size'
  | 'codex.species.speed'
  | 'codex.species.asi'
  | 'codex.common.languages'
  | 'codex.common.traits'
  | 'codex.bg.skills'
  | 'codex.bg.coins'
  | 'codex.class.hitDie'
  | 'codex.class.primaryAbility'
  | 'codex.class.savingThrows'
  | 'codex.class.skills'
  | 'codex.class.chooseAmong'
  | 'codex.class.features'
  | 'size.tiny'
  | 'size.small'
  | 'size.medium'
  | 'size.large'
  | 'size.huge'
  | 'size.gargantuan'
  // Compte / préférences (plan 35 — amorce)
  | 'account.title'
  | 'account.subtitle'
  | 'account.profile.title'
  | 'account.profile.anonymous'
  | 'account.profile.anonymousHint'
  | 'account.profile.emailLabel'
  | 'account.profile.providerLabel'
  | 'account.provider.google'
  | 'account.provider.password'
  | 'account.provider.anonymous'
  | 'account.prefs.title'
  | 'account.dice.title'
  | 'account.dice.hint'
  | 'account.dice.digital'
  | 'account.dice.digitalHint'
  | 'account.dice.physical'
  | 'account.dice.physicalHint'
  | 'account.dice.followCampaign'
  | 'account.dice.followCampaignHint'
  | 'account.locale.title'
  | 'account.locale.hint'
  | 'account.locale.fr'
  | 'account.locale.en'
  | 'account.content.title'
  | 'account.content.hint'
  | 'account.content.cta'
  | 'account.signOut'
  | 'account.signOutConfirm'
  | 'account.cancel'
  // Rappel « sauvegarde ton compte » (bandeau anonyme, hors écran Compte)
  | 'auth.nudge.title'
  | 'auth.nudge.body'
  | 'auth.nudge.cta'
  // Liaison de compte (invité → Google / e-mail)
  | 'account.link.title'
  | 'account.link.hint'
  | 'account.link.google'
  | 'account.link.or'
  | 'account.link.emailLabel'
  | 'account.link.emailPlaceholder'
  | 'account.link.passwordLabel'
  | 'account.link.passwordPlaceholder'
  | 'account.link.emailCta'
  | 'account.link.linking'
  | 'account.link.success'
  | 'account.link.error.emailInUse'
  | 'account.link.error.credentialInUse'
  | 'account.link.error.weakPassword'
  | 'account.link.error.invalidEmail'
  | 'account.link.error.popupClosed'
  | 'account.link.error.generic'
  // Accueil — hub de navigation
  | 'home.hub.title'
  | 'home.ongoing.label'
  | 'home.ongoing.kindEncounter'
  | 'home.ongoing.kindSession'
  | 'home.ongoing.round'
  | 'home.ongoing.sessionNumber'
  | 'home.ongoing.cta'
  // Brouillon de création en cours (E10 de l'audit UX)
  | 'home.draft.label'
  | 'home.draft.unnamed'
  | 'home.draft.step'
  | 'home.draft.resume'
  | 'home.draft.resumeAria'
  | 'home.draft.discard'
  | 'home.draft.discardAria'
  | 'home.hub.codex.sub'
  | 'home.hub.campaigns.sub'
  // Wizard (plan 05)
  | 'wizard.title'
  | 'wizard.subtitle'
  | 'wizard.campaignLink.banner'
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
  | 'wizard.label.droppedDie'
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
  | 'spell.metaShort.castingTime'
  | 'spell.metaShort.components'
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
  | 'sheet.campaignLink'
  | 'sheet.turnBanner.label'
  | 'sheet.turnBanner.sub'
  | 'sheet.turnBanner.aria'
  | 'sheet.error.title'
  | 'sheet.statusStrip.aria'
  | 'sheet.modeTabs.aria'
  | 'sheet.hero.level'
  | 'sheet.stat.hp'
  | 'sheet.stat.ac'
  | 'sheet.stat.init'
  | 'sheet.stat.speed'
  | 'sheet.stat.editInit'
  | 'sheet.stat.editSpeed'
  | 'sheet.stat.passivePerception'
  | 'sheet.combat.hitDice.title'
  | 'sheet.combat.hitDice.spend'
  | 'sheet.combat.hitDice.spending'
  | 'sheet.combat.hitDice.spendLabel'
  | 'sheet.combat.hitDice.restToast'
  | 'sheet.combat.longRest.button'
  | 'sheet.combat.longRest.confirm'
  | 'sheet.combat.longRest.toastTitle'
  | 'sheet.combat.longRest.grittyNote'
  | 'sheet.combat.longRest.slowHealingNote'
  | 'sheet.combat.longRest.hpPart'
  | 'sheet.combat.longRest.hitDicePart'
  | 'sheet.combat.longRest.exhaustionPart'
  | 'sheet.combat.rest.resourcesPart'
  | 'sheet.combat.shortRest.button'
  | 'sheet.combat.shortRest.confirm'
  | 'sheet.combat.shortRest.toastTitle'
  | 'sheet.combat.shortRest.toastNone'
  | 'sheet.combat.shortRest.hint'
  | 'sheet.combat.shortRest.pactNote'
  | 'sheet.combat.shortRest.grittyNote'
  | 'sheet.combat.resources.title'
  | 'sheet.combat.resources.spend'
  | 'sheet.combat.resources.restore'
  | 'sheet.combat.resources.spendLabel'
  | 'sheet.combat.resources.restoreLabel'
  | 'sheet.combat.resources.editMaxLabel'
  | 'sheet.combat.resources.restoresShort'
  | 'sheet.combat.resources.restoresLong'
  | 'sheet.combat.resources.rage'
  | 'sheet.combat.resources.secondWind'
  | 'sheet.combat.resources.actionSurge'
  | 'sheet.combat.resources.channelDivinity'
  | 'sheet.combat.resources.layOnHands'
  | 'sheet.combat.resources.wildShape'
  | 'sheet.combat.resources.sorceryPoints'
  | 'sheet.combat.resources.focusPoints'
  | 'sheet.combat.exhaustion.title'
  | 'sheet.combat.exhaustion.none'
  | 'sheet.combat.exhaustion.level'
  | 'sheet.combat.exhaustion.penalty'
  | 'sheet.combat.exhaustion.death'
  | 'sheet.combat.exhaustion.decrease'
  | 'sheet.combat.exhaustion.increase'
  | 'sheet.combat.exhaustion.readRule'
  | 'sheet.combat.condition.remove'
  | 'sheet.combat.concentration.title'
  | 'sheet.combat.concentration.cantrip'
  | 'sheet.combat.concentration.castAt'
  | 'sheet.combat.concentration.damageRule'
  | 'sheet.combat.concentration.break'
  | 'sheet.combat.concentration.rollSave'
  | 'sheet.combat.concentration.broken'
  | 'sheet.combat.concentration.unknownSpell'
  | 'sheet.combat.concentration.checkBig'
  | 'sheet.combat.concentration.checkSub'
  | 'sheet.combat.concentration.lostUnconscious'
  // Mode Combat — cartes, toasts et libellés a11y (i18n complète, FR+EN)
  | 'sheet.combat.uses'
  | 'sheet.combat.perLongRest'
  | 'sheet.combat.death.rollLabel'
  | 'sheet.combat.death.revivedTitle'
  | 'sheet.combat.death.revivedSub'
  | 'sheet.combat.death.stabilizedTitle'
  | 'sheet.combat.death.stabilizedSub'
  | 'sheet.combat.death.deadTitle'
  | 'sheet.combat.death.deadSub'
  | 'sheet.combat.death.twoFails'
  | 'sheet.combat.death.oneSuccess'
  | 'sheet.combat.death.oneFail'
  | 'sheet.combat.death.reviveTitle'
  | 'sheet.combat.death.reviveSub'
  | 'sheet.combat.death.headingDead'
  | 'sheet.combat.death.headingDying'
  | 'sheet.combat.death.proseDead'
  | 'sheet.combat.death.proseDying'
  | 'sheet.combat.death.successes'
  | 'sheet.combat.death.failures'
  | 'sheet.combat.death.rollButton'
  | 'sheet.combat.death.reviveButton'
  | 'sheet.combat.death.dmOnlyRevive'
  | 'sheet.combat.hp.cardTitle'
  | 'sheet.combat.hp.damageTakenTitle'
  | 'sheet.combat.hp.fraction'
  | 'sheet.combat.hp.massiveDeathTitle'
  | 'sheet.combat.hp.massiveDeathSub'
  | 'sheet.combat.hp.healTitle'
  | 'sheet.combat.hp.tempTitle'
  | 'sheet.combat.hp.tempBuffer'
  | 'sheet.combat.hp.tempRemoved'
  | 'sheet.combat.hp.tempEdit'
  | 'sheet.combat.hp.tempShort'
  | 'sheet.combat.hp.tempAdd'
  | 'sheet.combat.hp.liveLabel'
  | 'sheet.combat.hp.controlsHint'
  | 'sheet.combat.hp.band.healthy'
  | 'sheet.combat.hp.band.wounded'
  | 'sheet.combat.hp.band.critical'
  | 'sheet.combat.hp.band.dead'
  // Pavé numérique de saisie de montant (dégâts / soin / PV temporaires)
  | 'sheet.combat.numberpad.title.damage'
  | 'sheet.combat.numberpad.title.heal'
  | 'sheet.combat.numberpad.title.temp'
  | 'sheet.combat.numberpad.title.max'
  | 'sheet.combat.numberpad.commit.damage'
  | 'sheet.combat.numberpad.commit.heal'
  | 'sheet.combat.numberpad.commit.temp'
  | 'sheet.combat.numberpad.commit.max'
  | 'sheet.combat.hp.maxEdit'
  | 'sheet.combat.numberpad.cancel'
  | 'sheet.combat.numberpad.full'
  | 'sheet.combat.attacks.cardTitle'
  | 'sheet.combat.attacks.emptyPre'
  | 'sheet.combat.attacks.emptyPost'
  | 'sheet.combat.attacks.ranged'
  | 'sheet.combat.attacks.melee'
  | 'sheet.combat.attacks.menuAdvantage'
  | 'sheet.combat.attacks.menuDisadvantage'
  | 'sheet.combat.attacks.menuCrit'
  | 'sheet.combat.hud.action'
  | 'sheet.combat.hud.bonus'
  | 'sheet.combat.hud.reaction'
  | 'sheet.combat.hud.endTurnTitle'
  | 'sheet.combat.hud.endTurnSub'
  | 'sheet.combat.hud.inspirationTitle'
  | 'sheet.combat.hud.inspirationGranted'
  | 'sheet.combat.hud.inspirationRemoved'
  | 'sheet.combat.hud.initiativeLabel'
  | 'sheet.combat.hud.initShort'
  | 'sheet.combat.hud.inspirationGrantAria'
  | 'sheet.combat.hud.inspirationRemoveAria'
  | 'sheet.combat.hud.inspirationButton'
  | 'sheet.combat.hud.endTurnButton'
  | 'sheet.combat.breath.cardTitle'
  | 'sheet.combat.breath.regionLabel'
  | 'sheet.combat.breath.dragonLabel'
  | 'sheet.combat.breath.shape'
  | 'sheet.combat.breath.statDamage'
  | 'sheet.combat.breath.statDc'
  | 'sheet.combat.breath.statResist'
  | 'sheet.combat.breath.cadence'
  | 'sheet.combat.breath.spendLabel'
  | 'sheet.combat.breath.restoreLabel'
  | 'sheet.combat.conditions.cardTitle'
  | 'sheet.combat.conditions.removed'
  | 'sheet.combat.conditions.applied'
  | 'sheet.combat.conditions.detailAria'
  | 'sheet.combat.conditions.none'
  | 'sheet.combat.conditions.add'
  | 'sheet.combat.conditions.searchPlaceholder'
  | 'sheet.combat.conditions.noMatch'
  | 'sheet.combat.fightingStyle.cardTitle'
  | 'sheet.combat.fightingStyle.regionLabel'
  | 'sheet.combat.giant.cardTitle'
  | 'sheet.combat.giant.regionLabel'
  | 'sheet.combat.giant.spendLabel'
  | 'sheet.combat.giant.restoreLabel'
  | 'sheet.combat.party.cardTitle'
  | 'sheet.combat.party.comingSoon'
  | 'sheet.combat.party.noCampaign'
  | 'sheet.combat.slots.cardTitle'
  | 'sheet.combat.slots.toastTitle'
  | 'sheet.combat.slots.levelShort'
  | 'sheet.combat.slots.dotConsume'
  | 'sheet.combat.slots.dotConsumed'
  | 'sheet.essence.languages.title'
  | 'sheet.essence.proficiencies.title'
  | 'sheet.essence.proficiencies.armor'
  | 'sheet.essence.proficiencies.weapons'
  | 'sheet.essence.proficiencies.tools'
  | 'sheet.essence.originFeat.title'
  | 'sheet.essence.originFeat.openLabel'
  | 'sheet.essence.ancestryTraits.title'
  | 'sheet.essence.ancestryTraits.openLabel'
  | 'sheet.essence.classFeatures.title'
  | 'sheet.essence.classFeatures.openLabel'
  | 'sheet.essence.classFeatures.level'
  | 'sheet.mode.combat'
  | 'sheet.mode.essence'
  | 'sheet.mode.magie'
  | 'sheet.mode.avoir'
  | 'sheet.mode.ame'
  // Infobulles du Battle HUD (combat)
  | 'combat.hud.tip.action'
  | 'combat.hud.tip.bonus'
  | 'combat.hud.tip.reaction'
  | 'combat.hud.tip.initiative'
  | 'combat.hud.label'
  | 'combat.hud.rollInitiative'
  | 'combat.hp.tempTip'
  | 'combat.hp.tempLabel'
  | 'combat.hp.damageTip'
  | 'combat.hp.damageLabel'
  | 'combat.hp.healTip'
  | 'combat.hp.healLabel'
  | 'combat.hud.tip.inspirationGrant'
  | 'combat.hud.tip.inspirationRemove'
  | 'combat.hud.tip.endTurn'
  // Radial FAB (plan 11) — menu d'action docké
  | 'sheet.fab.openLabel'
  | 'sheet.fab.closeLabel'
  | 'sheet.fab.menuAria'
  | 'sheet.fab.back'
  | 'sheet.fab.allerA'
  | 'sheet.fab.sorts'
  | 'sheet.fab.outils'
  | 'sheet.fab.lancer'
  | 'sheet.fab.codex'
  | 'sheet.fab.repos'
  | 'sheet.fab.inspiration'
  | 'sheet.fab.inspirationOn'
  | 'sheet.fab.inspirationOff'
  | 'sheet.fab.historique'
  | 'sheet.fab.d20Label'
  | 'sheet.placeholder.todo'
  // Mode Âme (plan 20) — personnalité, histoire, statistiques
  | 'sheet.ame.personality.title'
  | 'sheet.ame.personality.empty'
  | 'sheet.ame.personality.edit'
  | 'sheet.ame.personality.save'
  | 'sheet.ame.personality.cancel'
  | 'sheet.ame.personality.editLabel'
  | 'sheet.ame.personality.placeholder.trait'
  | 'sheet.ame.personality.placeholder.ideal'
  | 'sheet.ame.personality.placeholder.bond'
  | 'sheet.ame.personality.placeholder.flaw'
  | 'sheet.ame.backstory.title'
  | 'sheet.ame.backstory.empty'
  | 'sheet.ame.backstory.placeholder'
  | 'sheet.ame.stats.title'
  | 'sheet.ame.stats.totalRolls'
  | 'sheet.ame.stats.avgD20'
  | 'sheet.ame.stats.crits'
  | 'sheet.ame.stats.fumbles'
  | 'sheet.ame.stats.topSkill'
  | 'sheet.ame.stats.noRolls'
  // Sorts d'ascendance — plan 13.8 / 13.8b
  | 'sheet.magie.ancestry.tieflingTitle'
  | 'sheet.magie.ancestry.elfTitle'
  | 'sheet.magie.ancestry.gnomeTitle'
  | 'sheet.magie.ancestry.genericTitle'
  // Label de source pour les sorts de trait COMMUN à l'ascendance (plan 13.14b
  // D18) — distinct du label « Héritage X » des sous-choix. Tieffelin : trait
  // « Présence d'outre-monde » → thaumaturgie, commun aux 3 héritages.
  | 'sheet.magie.ancestry.tieflingCommonSource'
  // D12b — sorts d'ascendance à recharge (Tieffelin / Elfe L3-L5, Gnome forêts).
  | 'sheet.magie.ancestryUsesLabel'
  | 'sheet.magie.ancestryPerLongRest'
  | 'sheet.magie.ancestryNoUsesLeft'
  | 'sheet.magie.ancestryLockedUntilLevel'
  // Source des sorts grantés par l'invocation Pacte du grimoire (D13e-followup-
  // grant-display) — 3 sorts mineurs + 2 sorts L1 rituels au choix de n'importe
  // quelle classe, persistés dans `classes[warlock].pactTomeCantrips`/`.pactTomeRituals`.
  | 'sheet.magie.pactTome.sourceLabel'
  // Préparation des sorts (Clerc/Druide/Paladin) — éditeur de liste préparée
  | 'sheet.magie.prep.titleFor'
  | 'sheet.magie.prep.count'
  | 'sheet.magie.prep.edit'
  | 'sheet.magie.prep.done'
  | 'sheet.magie.prep.hint'
  | 'sheet.magie.prep.hintWizard'
  | 'sheet.magie.prep.levelLabel'
  | 'sheet.magie.prep.prepared'
  | 'sheet.magie.prep.alwaysAvailable'
  | 'sheet.magie.prep.emptyPrepared'
  | 'sheet.magie.noMagic'
  // Mode Magie — cartes, cercle/pacte, liste, modale de sort (i18n complète)
  | 'sheet.magie.restore'
  | 'sheet.magie.noSlotToConsume'
  | 'sheet.magie.longPressRestore'
  | 'sheet.magie.cantripLabel'
  | 'sheet.magie.cantripsHeading'
  | 'sheet.magie.slotLevelShort'
  | 'sheet.magie.concentrationShort'
  | 'sheet.magie.ritualShort'
  | 'sheet.magie.searchPlaceholder'
  | 'sheet.magie.searchLabel'
  | 'sheet.magie.spellbookTitle'
  | 'sheet.magie.filterAll'
  | 'sheet.magie.filterPrepared'
  | 'sheet.magie.filterCantrips'
  | 'sheet.magie.filterRituals'
  | 'sheet.magie.noSpellMatch'
  | 'sheet.magie.preparedHeading'
  | 'sheet.magie.grimoireHeading'
  | 'sheet.magie.grimoireAllPrepared'
  | 'sheet.magie.pact.title'
  | 'sheet.magie.pact.consumed'
  | 'sheet.magie.pact.restored'
  | 'sheet.magie.pact.shortRestTitle'
  | 'sheet.magie.pact.shortRestSub'
  | 'sheet.magie.pact.slotsInfo'
  | 'sheet.magie.pact.dotConsume'
  | 'sheet.magie.pact.dotRestore'
  | 'sheet.magie.circle.title'
  | 'sheet.magie.circle.noneUnlocked'
  | 'sheet.magie.circle.slotConsumed'
  | 'sheet.magie.circle.slotRestored'
  | 'sheet.magie.circle.longRestTitle'
  | 'sheet.magie.circle.longRestSub'
  | 'sheet.magie.circle.centerLabel'
  | 'sheet.magie.circle.rings'
  | 'sheet.magie.circle.dotConsume'
  | 'sheet.magie.circle.dotRestore'
  | 'sheet.magie.detail.noCasterTitle'
  | 'sheet.magie.detail.noCasterSub'
  | 'sheet.magie.detail.noSlotTitle'
  | 'sheet.magie.detail.noSlotSub'
  | 'sheet.magie.detail.concBrokenTitle'
  | 'sheet.magie.detail.concBrokenSub'
  | 'sheet.magie.detail.castLevelSuffix'
  | 'sheet.magie.detail.castBigCantrip'
  | 'sheet.magie.detail.castDcHint'
  | 'sheet.magie.detail.castDone'
  | 'sheet.magie.detail.concSuffix'
  | 'sheet.magie.detail.ritualSuffix'
  | 'sheet.magie.detail.atHigherLevels'
  | 'sheet.magie.detail.castingClass'
  | 'sheet.magie.detail.classOption'
  | 'sheet.magie.detail.slotSection'
  | 'sheet.magie.detail.noSlotAvailable'
  | 'sheet.magie.detail.close'
  | 'sheet.magie.detail.attackShort'
  | 'sheet.magie.detail.attackLabel'
  | 'sheet.magie.detail.cast'
  // Section « Dégâts » de la modale détail — titre + aperçus de progression
  | 'sheet.magie.detail.damageTitle'
  | 'sheet.magie.detail.damageBasePreview'
  | 'sheet.magie.detail.damageCantripPreview'
  // Barre de stats d'incantation (une ligne par classe lanceuse)
  | 'sheet.magie.stats.classLevelShort'
  | 'sheet.magie.stats.abilityLabel'
  | 'sheet.magie.stats.dcLabel'
  | 'sheet.magie.stats.attackLabel'
  | 'sheet.magie.stats.preparedLabel'
  | 'sheet.magie.stats.preparedValue'
  // Carte profil de créature invoquée (plan D14) — rendue inline dans la modale
  // détail d'un sort d'invocation. Termes FR repris du SRD FR (stat block).
  | 'sheet.magie.summon.cardLabel'
  | 'sheet.magie.summon.heading'
  | 'sheet.magie.summon.ac'
  | 'sheet.magie.summon.hp'
  | 'sheet.magie.summon.speed'
  | 'sheet.magie.summon.senses'
  | 'sheet.magie.summon.languages'
  | 'sheet.magie.summon.challenge'
  | 'sheet.magie.summon.resistances'
  | 'sheet.magie.summon.immunities'
  | 'sheet.magie.summon.traits'
  | 'sheet.magie.summon.actions'
  | 'sheet.magie.summon.bonusActions'
  | 'sheet.magie.summon.reactions'
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
  // Abréviations d'aptitude (chips de sauvegarde) — distinctes des noms complets
  | 'ability.short.for'
  | 'ability.short.dex'
  | 'ability.short.con'
  | 'ability.short.int'
  | 'ability.short.sag'
  | 'ability.short.cha'
  // Mode Essence — cartes d'ordre, en-tête, sauvegardes, compétences, hexagramme
  | 'sheet.essence.advantage'
  | 'sheet.essence.normal'
  | 'sheet.essence.disadvantage'
  | 'sheet.essence.close'
  | 'sheet.essence.divineOrder.title'
  | 'sheet.essence.divineOrder.aria'
  | 'sheet.essence.primalOrder.title'
  | 'sheet.essence.primalOrder.aria'
  | 'sheet.essence.header.aura'
  | 'sheet.essence.header.inspirationChip'
  | 'sheet.essence.header.inspirationGranted'
  | 'sheet.essence.header.inspirationRemoved'
  | 'sheet.essence.header.inspirationGrantedSub'
  | 'sheet.essence.header.grantInspirationAria'
  | 'sheet.essence.header.removeInspirationAria'
  | 'sheet.essence.header.exhaustion'
  | 'sheet.essence.header.exhaustionPenalty'
  | 'sheet.essence.invocations.title'
  | 'sheet.essence.invocations.kind'
  | 'sheet.essence.invocations.aria'
  | 'sheet.essence.saves.title'
  | 'sheet.essence.saves.rollLabel'
  | 'sheet.essence.saves.menuTitle'
  | 'sheet.essence.saves.chipAria'
  | 'sheet.essence.saves.proficientSuffix'
  | 'sheet.essence.saves.menuAria'
  | 'sheet.essence.skills.title'
  | 'sheet.essence.skills.searchPlaceholder'
  | 'sheet.essence.skills.noMatch'
  | 'sheet.essence.skills.notProficient'
  | 'sheet.essence.skills.proficient'
  | 'sheet.essence.skills.expertise'
  | 'sheet.essence.hex.title'
  | 'sheet.essence.hex.proficiency'
  | 'sheet.essence.hex.rollLabel'
  | 'sheet.essence.hex.pointAria'
  | 'sheet.essence.hex.closeMenu'
  | 'sheet.essence.hex.short.int'
  | 'sheet.essence.hex.short.sag'
  | 'sheet.essence.hex.short.cha'
  | 'sheet.essence.hex.short.for'
  | 'sheet.essence.hex.short.con'
  | 'sheet.essence.hex.short.dex'
  // Combat — badge Weapon Mastery sur les armes équipées (plan 13.9 hotfix UAT)
  | 'sheet.combat.attacks.masteryBadgePrefix'
  | 'sheet.combat.attacks.masteryBadgeAria'
  // Nav shell (header sticky persistant — plan 13.6)
  | 'nav.aria'
  | 'nav.brand.aria'
  | 'nav.back'
  | 'nav.back.aria'
  | 'nav.back.campaigns'
  | 'nav.back.account'
  | 'nav.back.content'
  | 'nav.back.maps'
  | 'nav.avatar.aria'
  | 'sheet.turnOptions.title'
  | 'sheet.turnOptions.hint'
  | 'sheet.turnOptions.bonus'
  | 'sheet.turnOptions.bonus.empty'
  | 'sheet.turnOptions.reaction'
  | 'sheet.turnOptions.opportunityAttack'
  | 'account.haptics.title'
  | 'account.haptics.hint'
  | 'library.loading'
  | 'sheet.switcher.open'
  | 'sheet.switcher.title'
  | 'sheet.switcher.hint'
  | 'sheet.switcher.level'
  | 'account.dice3d.title'
  | 'account.notifications.title'
  | 'account.notifications.hint'
  | 'account.dice3d.hint'
  // Palette de commandes (⌘K)
  | 'palette.open'
  | 'palette.title'
  | 'palette.placeholder'
  | 'palette.hint'
  | 'palette.close'
  | 'palette.empty'
  | 'palette.loading'
  | 'palette.group.characters'
  | 'palette.group.campaigns'
  | 'palette.group.destinations'
  | 'palette.group.codex'
  | 'palette.nav.home'
  | 'palette.nav.campaigns'
  | 'palette.nav.codex'
  | 'palette.nav.account'
  | 'palette.nav.create'
  | 'palette.nav.join'
  | 'palette.nav.packs'
  | 'palette.keys.move'
  | 'palette.keys.select'
  | 'palette.keys.close'
  | 'palette.character.level'
  | 'palette.campaign.gm'
  | 'palette.campaign.player'
  | 'nav.tabs.aria'
  | 'nav.tab.characters'
  | 'nav.tab.campaigns'
  | 'nav.tab.codex'
  // Library (point d'entrée S1 — plan 13.6)
  | 'library.title'
  | 'library.subtitle'
  | 'library.cta.create'
  | 'library.cta.join'
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
  | 'library.card.campaign'
  // DM dashboard — vue MJ prototype 4A pré-V1 (recâblé sur vraies campagnes + members lors du JALON 4A)
  | 'dm.title'
  | 'dm.subtitle'
  | 'dm.empty.title'
  | 'dm.empty.body'
  | 'dm.party.title'
  | 'dm.party.ariaList'
  | 'dm.party.openSheet'
  | 'dm.party.hpLabel'
  | 'dm.party.acLabel'
  | 'dm.party.initLabel'
  | 'dm.party.conditionsAria'
  | 'dm.notes.title'
  | 'dm.notes.placeholder'
  | 'dm.notes.localOnly'
  | 'dm.notes.charsAria'
  | 'dm.secretRoll.title'
  | 'dm.secretRoll.subtitle'
  | 'dm.secretRoll.modLabel'
  | 'dm.secretRoll.button'
  | 'dm.secretRoll.normal'
  | 'dm.secretRoll.advantage'
  | 'dm.secretRoll.disadvantage'
  | 'dm.secretRoll.advantageAria'
  | 'dm.secretRoll.resultLabel'
  | 'dm.secretRoll.detail'
  | 'dm.secretRoll.nat20'
  | 'dm.secretRoll.nat1'
  | 'dm.secretRoll.historyAria'
  | 'dm.secretRoll.aboutLabel'
  | 'dm.secretRoll.aboutPlaceholder'
  | 'dm.secretRoll.reveal'
  | 'dm.secretRoll.revealed'
  | 'dm.tip.revealSecretRoll'
  // Campaigns — liste « Mes campagnes » + create/leave (JALON 4.0.4)
  | 'campaigns.title'
  | 'campaigns.subtitle'
  | 'campaigns.list.aria'
  | 'campaigns.empty.title'
  | 'campaigns.empty.body'
  | 'campaigns.error.title'
  | 'campaigns.error.body'
  | 'campaigns.error.retry'
  | 'campaigns.cta.create'
  | 'campaigns.cta.join'
  | 'campaigns.card.openSoon'
  | 'campaigns.card.open'
  | 'campaigns.card.leave'
  | 'campaigns.card.roleGm'
  | 'campaigns.card.roleMember'
  | 'campaigns.card.membersLabel'
  | 'campaigns.card.inviteCodeLabel'
  | 'campaigns.card.dateLabel'
  | 'campaigns.create.title'
  | 'campaigns.create.intro'
  | 'campaigns.create.name.label'
  | 'campaigns.create.name.helper'
  | 'campaigns.create.name.placeholder'
  | 'campaigns.create.description.label'
  | 'campaigns.create.description.helper'
  | 'campaigns.create.description.placeholder'
  | 'campaigns.create.cancel'
  | 'campaigns.create.submit'
  | 'campaigns.create.submitting'
  | 'campaigns.create.close'
  | 'campaigns.create.error.nameRequired'
  | 'campaigns.create.error.nameTooLong'
  | 'campaigns.create.error.notSignedIn'
  | 'campaigns.create.error.inviteCollision'
  | 'campaigns.create.error.generic'
  | 'campaigns.leave.title'
  | 'campaigns.leave.confirmPrefix'
  | 'campaigns.leave.confirmSuffix'
  | 'campaigns.leave.dataNotice'
  | 'campaigns.leave.cancel'
  | 'campaigns.leave.confirm'
  | 'campaigns.leave.submitting'
  | 'campaigns.leave.close'
  | 'campaigns.leave.error.lastGm'
  | 'campaigns.leave.error.notFound'
  | 'campaigns.leave.error.generic'
  // Campaign detail + join + promote (JALON 4.0.5)
  | 'campaigns.detail.back'
  | 'campaigns.detail.leaveCta'
  | 'campaigns.detail.invite.aria'
  | 'campaigns.detail.invite.title'
  | 'campaigns.detail.invite.codeLabel'
  | 'campaigns.detail.invite.codeAria'
  | 'campaigns.detail.invite.copy'
  | 'campaigns.detail.invite.copied'
  | 'campaigns.detail.invite.shareLink'
  | 'campaigns.detail.invite.linkCopied'
  | 'campaigns.detail.invite.shareTitle'
  | 'campaigns.detail.invite.help'
  | 'campaigns.detail.invite.firstStepTitle'
  | 'campaigns.detail.invite.firstStepBody'
  // Rotation du code d'invitation (M11) — révocation d'un code diffusé
  | 'campaigns.detail.invite.rotate'
  | 'campaigns.detail.invite.rotateConfirm'
  | 'campaigns.detail.invite.rotateCancel'
  | 'campaigns.detail.invite.rotating'
  | 'campaigns.detail.invite.rotateWarning'
  | 'campaigns.detail.invite.rotateError'
  | 'campaigns.detail.invite.rotated'
  | 'campaigns.detail.roster.aria'
  | 'campaigns.detail.roster.title'
  | 'campaigns.detail.dmTools.title'
  | 'campaigns.detail.dmTools.aria'
  // Superposition « Outils du meneur » en séance / en combat (E12)
  | 'campaigns.dmTools.open'
  | 'campaigns.dmTools.openTip'
  | 'campaigns.detail.roster.youSuffix'
  | 'campaigns.detail.roster.promote'
  | 'campaigns.detail.roster.demote'
  | 'campaigns.detail.roster.kick'
  | 'campaigns.detail.roster.viewSheet'
  // Modale d'autorité sur un membre — rétrogradation et exclusion (M11)
  | 'campaigns.memberAction.close'
  | 'campaigns.memberAction.cancel'
  | 'campaigns.memberAction.demote.title'
  | 'campaigns.memberAction.demote.confirmPrefix'
  | 'campaigns.memberAction.demote.confirmSuffix'
  | 'campaigns.memberAction.demote.notice'
  | 'campaigns.memberAction.demote.confirm'
  | 'campaigns.memberAction.demote.submitting'
  | 'campaigns.memberAction.kick.title'
  | 'campaigns.memberAction.kick.confirmPrefix'
  | 'campaigns.memberAction.kick.confirmSuffix'
  | 'campaigns.memberAction.kick.notice'
  | 'campaigns.memberAction.kick.confirm'
  | 'campaigns.memberAction.kick.submitting'
  | 'campaigns.memberAction.error.notFound'
  | 'campaigns.memberAction.error.lastGm'
  | 'campaigns.memberAction.error.generic'
  | 'campaigns.detail.party.aria'
  | 'campaigns.detail.party.title'
  | 'campaigns.detail.party.empty'
  | 'campaigns.detail.party.cardLoading'
  | 'campaigns.detail.party.cardError'
  | 'campaigns.detail.party.cardUnavailable'
  | 'campaigns.detail.partyAggregate.aria'
  | 'campaigns.detail.partyAggregate.size'
  | 'campaigns.detail.partyAggregate.avgLevel'
  | 'campaigns.detail.partyAggregate.levelRange'
  | 'campaigns.detail.partyAggregate.downed'
  | 'campaigns.detail.myCharacter.aria'
  | 'campaigns.detail.myCharacter.title'
  | 'campaigns.detail.myCharacter.none'
  | 'campaigns.detail.myCharacter.loading'
  | 'campaigns.detail.myCharacter.unknown'
  | 'campaigns.detail.myCharacter.levelPrefix'
  | 'campaigns.detail.myCharacter.link'
  | 'campaigns.detail.myCharacter.change'
  | 'campaigns.detail.myCharacter.open'
  | 'campaigns.detail.myCharacter.create'
  | 'campaigns.detail.myCharacter.linkExisting'
  | 'campaigns.detail.myCharacter.firstStepTitle'
  | 'campaigns.detail.myCharacter.firstStepBody'
  | 'campaigns.detail.error.title'
  | 'campaigns.detail.error.body'
  | 'campaigns.detail.error.retry'
  | 'campaigns.detail.error.notFoundTitle'
  | 'campaigns.detail.error.notFoundBody'
  // Entrée MJ vers le gestionnaire de séances (JALON 23.2)
  | 'campaigns.detail.sessionsCta'
  | 'campaigns.detail.encountersCta'
  | 'campaigns.detail.journalCta'
  | 'campaigns.detail.handoutsCta'
  | 'campaigns.detail.mapsCta'
  | 'campaigns.detail.mapsPlayerCta'
  | 'campaigns.detail.settingsCta'
  | 'campaigns.detail.spaces.aria'
  | 'campaigns.detail.spaces.play'
  | 'campaigns.detail.spaces.memory'
  // Réglages de campagne (nom / mode de dés / variantes 5e)
  | 'campaigns.settings.title'
  | 'campaigns.settings.intro'
  | 'campaigns.settings.close'
  | 'campaigns.settings.cancel'
  | 'campaigns.settings.save'
  | 'campaigns.settings.saving'
  | 'campaigns.settings.error.generic'
  | 'campaigns.settings.status.title'
  | 'campaigns.settings.status.hint'
  | 'campaigns.settings.status.active.label'
  | 'campaigns.settings.status.active.hint'
  | 'campaigns.settings.status.paused.label'
  | 'campaigns.settings.status.paused.hint'
  | 'campaigns.settings.status.archived.label'
  | 'campaigns.settings.status.archived.hint'
  | 'campaigns.status.paused'
  | 'campaigns.status.archived'
  | 'campaigns.detail.statusBanner.paused'
  | 'campaigns.detail.statusBanner.archived'
  | 'campaigns.settings.dice.title'
  | 'campaigns.settings.dice.hint'
  | 'campaigns.settings.variants.title'
  | 'campaigns.settings.variants.hint'
  | 'campaigns.settings.variants.featAtLevel1.label'
  | 'campaigns.settings.variants.featAtLevel1.desc'
  | 'campaigns.settings.variants.flanking.label'
  | 'campaigns.settings.variants.flanking.desc'
  | 'campaigns.settings.variants.slowHealing.label'
  | 'campaigns.settings.variants.slowHealing.desc'
  | 'campaigns.settings.variants.grittyRealism.label'
  | 'campaigns.settings.variants.grittyRealism.desc'
  // Handouts MJ→joueur — plan 27
  | 'handouts.toast.title'
  | 'encounters.toast.started.title'
  | 'encounters.toast.yourTurn.title'
  | 'encounters.toast.yourTurn.sub'
  | 'handouts.screen.back'
  | 'handouts.screen.title'
  | 'handouts.screen.subtitleDm'
  | 'handouts.screen.subtitlePlayer'
  | 'handouts.screen.newCta'
  | 'handouts.search.placeholder'
  | 'handouts.search.aria'
  | 'handouts.search.noMatch'
  | 'handouts.screen.empty.dm'
  | 'handouts.screen.empty.player'
  | 'handouts.screen.activeHeading'
  | 'handouts.screen.archivedHeading'
  | 'handouts.screen.loadError'
  | 'handouts.card.recipientsAll'
  | 'handouts.card.recipientsTargeted'
  | 'handouts.card.open'
  | 'handouts.card.archive'
  | 'handouts.card.archivedBadge'
  | 'handouts.card.openedBadge'
  | 'handouts.card.newBadge'
  | 'handouts.detail.close'
  | 'handouts.create.title'
  | 'handouts.create.fieldTitle'
  | 'handouts.create.titlePlaceholder'
  | 'handouts.create.fieldType'
  | 'handouts.create.type.text'
  | 'handouts.create.type.image'
  | 'handouts.create.type.mixed'
  | 'handouts.create.imageDeferred'
  | 'handouts.create.fieldContent'
  | 'handouts.create.contentPlaceholder'
  | 'handouts.create.previewLabel'
  | 'handouts.create.previewEmpty'
  | 'handouts.create.fieldRecipients'
  | 'handouts.create.recipientsAll'
  | 'handouts.create.recipientsSome'
  | 'handouts.create.noPlayers'
  | 'handouts.create.cancel'
  | 'handouts.create.send'
  | 'handouts.create.sending'
  | 'handouts.create.error.title'
  | 'handouts.create.error.content'
  | 'handouts.create.error.recipients'
  | 'handouts.create.error.send'
  | 'handouts.create.sentToast'
  // Cycle de vie d'un document envoyé (M12) — corriger, désarchiver, supprimer
  | 'handouts.card.edit'
  | 'handouts.card.unarchive'
  | 'handouts.card.delete'
  | 'handouts.card.deleteConfirm'
  | 'handouts.card.recipientsNone'
  | 'handouts.edit.title'
  | 'handouts.edit.save'
  | 'handouts.edit.saving'
  | 'handouts.edit.savedToast'
  | 'campaigns.tip.editHandout'
  | 'campaigns.tip.unarchiveHandout'
  | 'campaigns.tip.deleteHandout'
  // PNJ récurrents — plan 28
  | 'campaigns.detail.npcsCta'
  | 'campaigns.detail.eventFeed.kind.npcIntroduced'
  | 'campaigns.detail.eventFeed.kind.npcAttitudeChanged'
  | 'npcs.role.merchant'
  | 'npcs.role.ally'
  | 'npcs.role.enemy'
  | 'npcs.role.contact'
  | 'npcs.role.noble'
  | 'npcs.role.other'
  | 'npcs.attitude.friendly'
  | 'npcs.attitude.neutral'
  | 'npcs.attitude.hostile'
  | 'npcs.attitude.unknown'
  | 'npcs.visibility.all'
  | 'npcs.visibility.dm'
  | 'npcs.screen.back'
  | 'npcs.screen.title'
  | 'npcs.screen.subtitleDm'
  | 'npcs.screen.subtitlePlayer'
  | 'npcs.screen.newCta'
  | 'npcs.screen.empty.dm'
  | 'npcs.screen.empty.player'
  | 'npcs.screen.noMatch'
  | 'npcs.screen.loadError'
  | 'npcs.screen.loading'
  | 'npcs.card.secretBadge'
  | 'npcs.card.combatBadge'
  | 'npcs.filters.aria'
  | 'npcs.filters.role'
  | 'npcs.filters.tag'
  | 'npcs.filters.location'
  | 'npcs.filters.all'
  | 'npcs.detail.back'
  | 'npcs.detail.notFound'
  | 'npcs.detail.edit'
  | 'npcs.detail.delete'
  | 'npcs.detail.duplicate'
  | 'npcs.duplicate.title'
  | 'npcs.duplicate.intro'
  | 'npcs.duplicate.helper'
  | 'npcs.duplicate.noTarget'
  | 'npcs.duplicate.confirm'
  | 'npcs.duplicate.busy'
  | 'npcs.duplicate.cancel'
  | 'npcs.duplicate.error'
  | 'npcs.duplicate.doneToast'
  | 'npcs.search.placeholder'
  | 'npcs.search.aria'
  | 'npcs.sort.aria'
  | 'npcs.sort.introduction'
  | 'npcs.sort.alpha'
  | 'npcs.detail.secretBadge'
  | 'npcs.detail.publicHeading'
  | 'npcs.detail.relationsHeading'
  | 'npcs.detail.relations.editCta'
  | 'npcs.detail.relations.empty'
  | 'npcs.detail.combatHeading'
  | 'npcs.detail.combat.cr'
  | 'npcs.detail.combat.ac'
  | 'npcs.detail.combat.hp'
  | 'npcs.detail.combat.monster'
  | 'npcs.detail.dmNotesHeading'
  | 'npcs.detail.dmOnlyHint'
  | 'npcs.detail.dmNotesEmpty'
  | 'npcs.detail.deletedToast'
  | 'npcs.detail.deleteError'
  | 'npcs.detail.deleteConfirm.title'
  | 'npcs.detail.deleteConfirm.body'
  | 'npcs.detail.deleteConfirm.cancel'
  | 'npcs.detail.deleteConfirm.confirm'
  | 'npcs.detail.deleteConfirm.deleting'
  | 'npcs.relations.title'
  | 'npcs.relations.close'
  | 'npcs.relations.done'
  | 'npcs.relations.noCharacters'
  | 'npcs.relations.error'
  | 'npcs.edit.createTitle'
  | 'npcs.edit.editTitle'
  | 'npcs.edit.field.name'
  | 'npcs.edit.field.namePlaceholder'
  | 'npcs.edit.field.role'
  | 'npcs.edit.field.location'
  | 'npcs.edit.field.locationPlaceholder'
  | 'npcs.edit.field.portrait'
  | 'npcs.edit.field.portraitHelper'
  | 'npcs.edit.field.portraitPlaceholder'
  | 'npcs.edit.field.shortDescription'
  | 'npcs.edit.field.shortDescriptionPlaceholder'
  | 'npcs.edit.field.publicDescription'
  | 'npcs.edit.field.publicDescriptionPlaceholder'
  | 'npcs.edit.markdownHelper'
  | 'npcs.edit.field.dmNotes'
  | 'npcs.edit.field.dmNotesHelper'
  | 'npcs.edit.field.dmNotesPlaceholder'
  | 'npcs.edit.field.tags'
  | 'npcs.edit.field.tagsHelper'
  | 'npcs.edit.field.tagsPlaceholder'
  | 'npcs.edit.field.visibility'
  | 'npcs.edit.field.visibilityHelper'
  | 'npcs.edit.portraitImageAdd'
  | 'npcs.edit.portraitImageReplace'
  | 'npcs.edit.portraitImageRemove'
  | 'npcs.edit.portraitImageBusy'
  | 'npcs.edit.portraitImageError'
  | 'npcs.edit.portraitImageAlt'
  | 'npcs.edit.combat.enable'
  | 'npcs.edit.combat.cr'
  | 'npcs.edit.combat.ac'
  | 'npcs.edit.combat.hp'
  | 'npcs.edit.combat.notes'
  | 'npcs.edit.combat.linkMonster'
  | 'npcs.edit.combat.unlinkMonster'
  | 'npcs.edit.combat.linkMonsterHelper'
  | 'npcs.edit.cancel'
  | 'npcs.edit.save'
  | 'npcs.edit.saving'
  | 'npcs.edit.error.name'
  | 'npcs.edit.error.save'
  | 'npcs.edit.createdToast'
  | 'npcs.edit.updatedToast'
  | 'encounters.create.npcs.title'
  | 'encounters.create.npcs.intro'
  | 'encounters.create.npcs.empty'
  | 'encounters.create.npcs.hpLabel'
  | 'encounters.create.error.npcHp'
  // Lecture MJ d'une fiche de joueur — JALON 4A.3
  | 'campaigns.memberSheet.back'
  | 'campaigns.memberSheet.viewingPrefix'
  | 'campaigns.memberSheet.forbidden.title'
  | 'campaigns.memberSheet.forbidden.body'
  | 'campaigns.memberSheet.memberNotFound.title'
  | 'campaigns.memberSheet.memberNotFound.body'
  | 'campaigns.memberSheet.noCharacter.title'
  | 'campaigns.memberSheet.noCharacter.body'
  | 'campaigns.memberSheet.error.title'
  | 'campaigns.memberSheet.error.body'
  // Feed d'activité MJ — JALON 22.3
  | 'campaigns.detail.eventFeed.aria'
  | 'campaigns.detail.eventFeed.title'
  | 'campaigns.detail.eventFeed.empty'
  | 'campaigns.detail.eventFeed.loading'
  | 'campaigns.detail.eventFeed.error'
  | 'campaigns.detail.eventFeed.dmOnlyHint'
  | 'campaigns.detail.eventFeed.levelPrefix'
  | 'campaigns.detail.eventFeed.kind.roll'
  | 'campaigns.detail.eventFeed.kind.hpChange'
  | 'campaigns.detail.eventFeed.kind.tempHp'
  | 'campaigns.detail.eventFeed.kind.conditionAdd'
  | 'campaigns.detail.eventFeed.kind.conditionRemove'
  | 'campaigns.detail.eventFeed.kind.spellCast'
  | 'campaigns.detail.eventFeed.kind.slotConsumed'
  | 'campaigns.detail.eventFeed.kind.slotRestored'
  | 'campaigns.detail.eventFeed.kind.itemAcquired'
  | 'campaigns.detail.eventFeed.kind.itemRemoved'
  | 'campaigns.detail.eventFeed.kind.secretRoll'
  | 'campaigns.detail.eventFeed.kind.sessionStart'
  | 'campaigns.detail.eventFeed.kind.sessionEnd'
  | 'campaigns.detail.eventFeed.kind.generic'
  | 'campaigns.detail.eventFeed.kind.dmEdit'
  | 'campaigns.detail.eventFeed.dmEdit.summary'
  | 'campaigns.detail.eventFeed.dmEdit.fieldsRow'
  | 'campaigns.detail.eventFeed.dmEditField.generic'
  | 'campaigns.detail.eventFeed.dmEditField.hp'
  | 'campaigns.detail.eventFeed.dmEditField.conditions'
  | 'campaigns.detail.eventFeed.dmEditField.exhaustion'
  | 'campaigns.detail.eventFeed.dmEditField.inspiration'
  | 'campaigns.detail.eventFeed.dmEditField.deathSaves'
  | 'campaigns.detail.eventFeed.dmEditField.abilities'
  | 'campaigns.detail.eventFeed.dmEditField.saveProficiencies'
  | 'campaigns.detail.eventFeed.dmEditField.skills'
  | 'campaigns.detail.eventFeed.dmEditField.ac'
  | 'campaigns.detail.eventFeed.dmEditField.speed'
  | 'campaigns.detail.eventFeed.dmEditField.initiative'
  | 'campaigns.detail.eventFeed.dmEditField.hitDice'
  | 'campaigns.detail.eventFeed.dmEditField.spellSlots'
  | 'campaigns.detail.eventFeed.dmEditField.classResources'
  | 'campaigns.detail.eventFeed.dmEditField.preparedSpells'
  | 'campaigns.detail.eventFeed.dmEditField.knownSpells'
  | 'campaigns.detail.eventFeed.dmEditField.inventory'
  | 'campaigns.detail.eventFeed.dmEditField.featureUsage'
  | 'campaigns.detail.eventFeed.dmEditField.extraProficiencies'
  | 'campaigns.detail.eventFeed.dmEditField.experience'
  | 'campaigns.detail.eventFeed.dmEditField.alignment'
  | 'campaigns.detail.eventFeed.dmEditField.totalLevel'
  | 'campaigns.detail.eventFeed.dmEditField.status'
  | 'campaigns.detail.eventFeed.dmEditField.stats'
  | 'campaigns.memberSheet.dmEditBadge'
  | 'sheet.dmEdit.bannerTitle'
  | 'sheet.dmEdit.bannerHint'
  | 'sheet.dmEdit.fieldLocked'
  | 'journal.tpl.dmEdit'
  | 'sessions.events.title'
  | 'sessions.events.empty'
  | 'sessions.events.loading'
  | 'sessions.events.error'
  | 'sessions.events.filter.aria'
  | 'sessions.events.filter.all'
  | 'sessions.events.filter.dmEdits'
  | 'campaigns.detail.eventFeed.openDetail'
  | 'campaigns.detail.eventFeed.filter.aria'
  | 'campaigns.detail.eventFeed.filter.all'
  | 'campaigns.detail.eventFeed.filter.emptyForPlayer'
  | 'campaigns.detail.eventFeed.detail.close'
  | 'campaigns.detail.eventFeed.detail.actor'
  | 'campaigns.detail.eventFeed.detail.target'
  | 'campaigns.detail.eventFeed.detail.dmActor'
  | 'campaigns.detail.eventFeed.detail.systemActor'
  | 'campaigns.detail.eventFeed.detail.unknownCharacter'
  | 'campaigns.detail.eventFeed.detail.noDetail'
  | 'campaigns.detail.eventFeed.detail.delete'
  | 'campaigns.detail.eventFeed.detail.deleteConfirm'
  | 'campaigns.detail.eventFeed.detail.deleteError'
  | 'campaigns.detail.eventFeed.field.label'
  | 'campaigns.detail.eventFeed.field.total'
  | 'campaigns.detail.eventFeed.field.modifier'
  | 'campaigns.detail.eventFeed.field.dice'
  | 'campaigns.detail.eventFeed.field.before'
  | 'campaigns.detail.eventFeed.field.after'
  | 'campaigns.detail.eventFeed.field.delta'
  | 'campaigns.detail.eventFeed.field.reason'
  | 'campaigns.detail.eventFeed.field.level'
  | 'campaigns.detail.eventFeed.field.slot'
  | 'campaigns.detail.eventFeed.field.count'
  | 'campaigns.detail.eventFeed.field.quantity'
  | 'campaigns.detail.eventFeed.field.components'
  | 'campaigns.detail.eventFeed.field.crit'
  | 'campaigns.detail.eventFeed.field.fumble'
  | 'campaigns.detail.eventFeed.reason.damage'
  | 'campaigns.detail.eventFeed.reason.heal'
  | 'campaigns.detail.eventFeed.value.yes'
  | 'campaigns.detail.eventFeed.value.no'
  | 'campaigns.join.title'
  | 'campaigns.join.intro'
  | 'campaigns.join.code.label'
  | 'campaigns.join.code.helper'
  | 'campaigns.join.code.placeholder'
  | 'campaigns.join.cancel'
  | 'campaigns.join.submit'
  | 'campaigns.join.submitting'
  | 'campaigns.join.error.lengthInvalid'
  | 'campaigns.join.error.formatInvalid'
  | 'campaigns.join.error.codeNotFound'
  | 'campaigns.join.error.campaignNotFound'
  | 'campaigns.join.error.notSignedIn'
  | 'campaigns.join.error.generic'
  | 'campaigns.promote.title'
  | 'campaigns.promote.confirmPrefix'
  | 'campaigns.promote.confirmSuffix'
  | 'campaigns.promote.notice'
  | 'campaigns.promote.cancel'
  | 'campaigns.promote.confirm'
  | 'campaigns.promote.submitting'
  | 'campaigns.promote.close'
  | 'campaigns.promote.error.notFound'
  | 'campaigns.promote.error.generic'
  | 'campaigns.linkCharacter.title'
  | 'campaigns.linkCharacter.intro'
  | 'campaigns.linkCharacter.loading'
  | 'campaigns.linkCharacter.empty'
  | 'campaigns.linkCharacter.listAria'
  | 'campaigns.linkCharacter.noneOption'
  | 'campaigns.linkCharacter.levelPrefix'
  | 'campaigns.linkCharacter.currentSuffix'
  | 'campaigns.linkCharacter.cancel'
  | 'campaigns.linkCharacter.confirm'
  | 'campaigns.linkCharacter.submitting'
  | 'campaigns.linkCharacter.close'
  | 'campaigns.linkCharacter.error.generic'
  // Gestionnaire de séances (sessions) — JALON 23.2 (liste + planification)
  | 'sessions.back'
  | 'sessions.title'
  | 'sessions.list.aria'
  | 'sessions.cta.plan'
  | 'sessions.empty.gm'
  | 'sessions.empty.member'
  | 'sessions.row.numberPrefix'
  | 'sessions.status.planned'
  | 'sessions.status.active'
  | 'sessions.status.completed'
  | 'sessions.status.cancelled'
  | 'sessions.error.title'
  | 'sessions.error.body'
  | 'sessions.error.retry'
  | 'sessions.create.title'
  | 'sessions.create.intro'
  | 'sessions.create.titleField.label'
  | 'sessions.create.titleField.helper'
  | 'sessions.create.titleField.placeholder'
  | 'sessions.create.date.label'
  | 'sessions.create.date.helper'
  | 'sessions.create.cancel'
  | 'sessions.create.submit'
  | 'sessions.create.submitting'
  | 'sessions.create.close'
  | 'sessions.create.error.titleRequired'
  | 'sessions.create.error.titleTooLong'
  | 'sessions.create.error.generic'
  // Écran séance (SessionScreen + onglets) — JALON 23.3
  | 'sessions.detail.back'
  | 'sessions.detail.error.title'
  | 'sessions.detail.error.body'
  | 'sessions.detail.error.notFoundTitle'
  | 'sessions.detail.error.notFoundBody'
  | 'sessions.tabs.aria'
  | 'sessions.tab.notes'
  | 'sessions.tab.attendance'
  | 'sessions.tab.events'
  | 'sessions.tab.journal'
  | 'sessions.notes.label'
  | 'sessions.notes.placeholder'
  | 'sessions.notes.editorAria'
  | 'sessions.notes.hint'
  | 'sessions.notes.empty'
  | 'sessions.notes.status.pending'
  | 'sessions.notes.status.saving'
  | 'sessions.notes.status.saved'
  | 'sessions.notes.status.error'
  | 'sessions.attendance.title'
  | 'sessions.attendance.empty'
  | 'sessions.attendance.status.saving'
  | 'sessions.attendance.status.saved'
  | 'sessions.attendance.status.error'
  | 'sessions.journal.placeholder'
  // Journal compilé — onglet séance (plan 25.2)
  | 'sessions.journal.emptyTitle'
  | 'sessions.journal.emptyBody'
  | 'sessions.journal.emptyBodyDm'
  | 'sessions.journal.compile'
  | 'sessions.journal.recompile'
  | 'sessions.journal.compiling'
  | 'sessions.journal.compileError'
  | 'sessions.journal.compiledHint'
  // Journal — édition manuelle + confirmation re-compilation (plan 25.3)
  | 'sessions.journal.edit'
  | 'sessions.journal.editLabel'
  | 'sessions.journal.save'
  | 'sessions.journal.saving'
  | 'sessions.journal.cancel'
  | 'sessions.journal.saveError'
  | 'sessions.journal.editedHint'
  | 'sessions.journal.recompileConfirmTitle'
  | 'sessions.journal.recompileConfirmBody'
  | 'sessions.journal.recompileConfirm'
  // Cadrage du récit compilé (M14) — ce que le journal embarque
  | 'sessions.journal.scope.legend'
  | 'sessions.journal.scope.rolls'
  | 'sessions.journal.scope.monsterHp'
  | 'sessions.journal.scope.dmOnly'
  | 'sessions.journal.scope.help'
  // Démarrage / clôture de séance — JALON 23.4
  | 'sessions.action.start'
  | 'sessions.action.end'
  | 'sessions.action.starting'
  | 'sessions.action.ending'
  | 'sessions.action.error.anotherActive'
  | 'sessions.action.error.generic'
  // Cycle de vie d'une séance (M13) — renommer, annuler, rouvrir
  | 'sessions.edit.cta'
  | 'sessions.edit.title'
  | 'sessions.edit.close'
  | 'sessions.edit.save'
  | 'sessions.edit.saving'
  | 'sessions.edit.number.label'
  | 'sessions.edit.number.helper'
  | 'sessions.edit.error.number'
  | 'sessions.edit.error.generic'
  | 'sessions.action.cancel'
  | 'sessions.action.cancelConfirm'
  | 'sessions.action.cancelNotice'
  | 'sessions.action.reopen'
  | 'sessions.action.reopening'
  | 'campaigns.tip.editSession'
  | 'campaigns.tip.cancelSession'
  | 'campaigns.tip.reopenSession'
  // Rencontres de combat — JALON 24.2 (liste + création)
  | 'encounters.back'
  | 'encounters.title'
  | 'encounters.list.aria'
  | 'encounters.cta.create'
  | 'encounters.empty.gm'
  | 'encounters.empty.member'
  | 'encounters.row.participantsSuffix'
  | 'encounters.row.participantsSuffixOne'
  | 'encounters.status.planned'
  | 'encounters.status.active'
  | 'encounters.status.completed'
  | 'encounters.status.aborted'
  | 'encounters.error.title'
  | 'encounters.error.body'
  | 'encounters.error.retry'
  | 'encounters.create.title'
  | 'encounters.create.intro'
  | 'encounters.create.close'
  | 'encounters.create.cancel'
  | 'encounters.create.submit'
  | 'encounters.create.submitting'
  | 'encounters.create.nameField.label'
  | 'encounters.create.nameField.helper'
  | 'encounters.create.nameField.placeholder'
  | 'encounters.create.party.title'
  | 'encounters.create.party.empty'
  | 'encounters.create.party.loading'
  | 'encounters.create.party.error'
  | 'encounters.create.party.hpLabel'
  | 'encounters.create.monsters.title'
  | 'encounters.create.monsters.intro'
  | 'encounters.create.monsters.nameLabel'
  | 'encounters.create.monsters.namePlaceholder'
  | 'encounters.create.monsters.hpLabel'
  | 'encounters.create.monsters.hpPlaceholder'
  | 'encounters.create.monsters.qtyLabel'
  | 'encounters.create.monsters.addRow'
  | 'encounters.create.monsters.fromBestiary'
  | 'encounters.create.monsters.removeRow'
  | 'encounters.create.error.nameRequired'
  | 'encounters.create.error.nameTooLong'
  | 'encounters.create.error.noParticipants'
  | 'encounters.create.error.monsterName'
  | 'encounters.create.error.monsterHp'
  | 'encounters.create.error.generic'
  // Encounters — écran de combat (JALON 24.3)
  | 'encounters.detail.back'
  | 'encounters.detail.codex'
  | 'encounters.detail.roster'
  | 'encounters.detail.rosterTip'
  | 'campaigns.roster.overlay.subtitle'
  | 'campaigns.roster.overlay.close'
  | 'campaigns.roster.overlay.empty'
  | 'encounters.detail.codexTip'
  | 'encounters.detail.round'
  | 'encounters.detail.error.title'
  | 'encounters.detail.error.body'
  | 'encounters.detail.error.notFoundTitle'
  | 'encounters.detail.error.notFoundBody'
  | 'encounters.detail.error.retry'
  | 'encounters.action.rollInit'
  | 'encounters.action.rollingInit'
  | 'encounters.action.reroll'
  | 'encounters.action.start'
  | 'encounters.action.starting'
  | 'encounters.action.endTurn'
  | 'encounters.action.end'
  | 'encounters.action.ending'
  | 'encounters.action.cancelEnd'
  | 'encounters.action.previousTurn'
  | 'encounters.action.abort'
  | 'encounters.action.reopen'
  | 'encounters.action.reopening'
  | 'encounters.detail.closedHint'
  | 'encounters.row.actions'
  | 'encounters.row.manageTitle'
  | 'encounters.row.manageCloseAria'
  | 'encounters.row.renameLabel'
  | 'encounters.row.renameSave'
  | 'encounters.row.delete'
  | 'encounters.row.deleteConfirm'
  | 'encounters.action.error.anotherActive'
  | 'encounters.action.error.noParticipants'
  | 'encounters.action.error.generic'
  | 'encounters.outcome.prompt'
  | 'encounters.outcome.victory'
  | 'encounters.outcome.defeat'
  | 'encounters.outcome.fled'
  | 'encounters.turnOrder.title'
  | 'encounters.turnOrder.aria'
  | 'encounters.turnOrder.empty'
  | 'encounters.turnOrder.currentTurn'
  | 'encounters.participant.initLabel'
  | 'encounters.participant.hpLabel'
  | 'encounters.participant.typeMonster'
  | 'encounters.control.open'
  | 'encounters.control.hpTitle'
  | 'encounters.control.amount'
  | 'encounters.control.damage'
  | 'encounters.control.heal'
  | 'encounters.control.applying'
  | 'encounters.control.conditionsTitle'
  | 'encounters.control.noConditions'
  | 'encounters.control.addCondition'
  | 'encounters.control.closeAria'
  | 'encounters.control.viewStatBlock'
  | 'encounters.control.statBlockCloseAria'
  | 'encounters.control.tempHp'
  | 'encounters.control.customCondition'
  | 'encounters.control.customConditionPlaceholder'
  | 'encounters.control.customConditionAdd'
  | 'encounters.control.noteTitle'
  | 'encounters.control.notePlaceholder'
  | 'encounters.control.noteSave'
  | 'encounters.playerControl.badge'
  | 'encounters.playerControl.help'
  | 'encounters.playerControl.loading'
  | 'encounters.playerControl.unreadable'
  | 'encounters.playerControl.open'
  | 'encounters.control.editTitle'
  | 'encounters.control.editName'
  | 'encounters.control.editInitiative'
  | 'encounters.control.editCurrentHp'
  | 'encounters.control.editMaxHp'
  | 'encounters.control.editSave'
  | 'encounters.control.remove'
  | 'encounters.control.removeConfirm'
  | 'encounters.add.open'
  | 'encounters.add.title'
  | 'encounters.add.intro'
  | 'encounters.add.closeAria'
  | 'encounters.add.nameLabel'
  | 'encounters.add.namePlaceholder'
  | 'encounters.add.hpLabel'
  | 'encounters.add.typeLabel'
  | 'encounters.add.typeMonster'
  | 'encounters.add.typeNpc'
  | 'encounters.add.fromBestiary'
  | 'encounters.add.submit'
  | 'encounters.add.cancel'
  | 'encounters.add.error.name'
  | 'encounters.add.error.hp'
  | 'encounters.handoff.title'
  | 'encounters.handoff.help'
  | 'encounters.handoff.aria'
  | 'encounters.handoff.attackPrefix'
  | 'encounters.handoff.damageSuffix'
  | 'encounters.handoff.attackInfo'
  | 'encounters.handoff.apply'
  | 'encounters.handoff.chooseTarget'
  | 'encounters.handoff.noTargets'
  | 'encounters.handoff.dismiss'
  | 'encounters.handoff.unknownActor'
  | 'encounters.party.title'
  | 'encounters.party.aria'
  | 'encounters.party.allies'
  | 'encounters.party.enemies'
  | 'encounters.party.empty'
  // Journal — compilateur d'événements → narration FR (plan 25.1). Les clés
  // `journal.tpl.*` portent des placeholders `{xxx}` substitués par `fillTemplate`.
  | 'journal.section.exploration'
  | 'journal.section.combat'
  | 'journal.section.combatOutcome.victory'
  | 'journal.section.combatOutcome.defeat'
  | 'journal.section.combatOutcome.fled'
  | 'journal.empty'
  | 'journal.actor.dm'
  | 'journal.actor.someone'
  | 'journal.tpl.sessionStart'
  | 'journal.tpl.sessionEnd'
  | 'journal.tpl.turnStart'
  | 'journal.tpl.rollAttackCrit'
  | 'journal.tpl.rollAttackFumble'
  | 'journal.tpl.rollAttack'
  | 'journal.tpl.rollDamage'
  | 'journal.tpl.rollSave'
  | 'journal.tpl.rollCheck'
  | 'journal.tpl.rollDeathSave'
  | 'journal.tpl.rollGeneric'
  | 'journal.tpl.spellCast'
  | 'journal.tpl.spellCantrip'
  | 'journal.tpl.hpDamage'
  | 'journal.tpl.hpHeal'
  | 'journal.tpl.tempHp'
  | 'journal.tpl.conditionAdd'
  | 'journal.tpl.conditionRemove'
  | 'journal.tpl.slotConsumedOne'
  | 'journal.tpl.slotConsumedMany'
  | 'journal.tpl.slotRestoredOne'
  | 'journal.tpl.slotRestoredMany'
  | 'journal.tpl.itemAcquiredOne'
  | 'journal.tpl.itemAcquiredMany'
  | 'journal.tpl.itemRemovedOne'
  | 'journal.tpl.itemRemovedMany'
  | 'journal.tpl.monsterHpChangeDamage'
  | 'journal.tpl.monsterHpChangeHeal'
  // Journal — vue agrégée campagne (plan 25.4)
  | 'journal.aggregate.title'
  | 'journal.aggregate.subtitle'
  | 'journal.aggregate.back'
  | 'journal.aggregate.export'
  | 'journal.aggregate.exportSession'
  | 'journal.aggregate.empty'
  | 'journal.aggregate.sessionNumberPrefix'
  | 'journal.aggregate.notCompiled'
  | 'journal.aggregate.expand'
  | 'journal.aggregate.collapse'
  | 'journal.aggregate.error'
  | 'journal.aggregate.retry'
  // Avoir — form custom item (placeholder neutralisé — plan 13.6 cleanup)
  | 'avoir.customItem.placeholder'
  // Avoir — résumé d'harmonisation (carte « Harmonisation »)
  | 'sheet.avoir.attunement.title'
  | 'sheet.avoir.attunement.count'
  | 'sheet.avoir.attunement.empty'
  | 'sheet.avoir.attunement.atCap'
  // Mode Avoir — inventaire, bourse, ajout/création d'objet, détail (i18n complète)
  | 'sheet.avoir.close'
  | 'sheet.avoir.cancel'
  | 'sheet.avoir.quantity'
  | 'sheet.avoir.unknownError'
  | 'sheet.avoir.equipped'
  | 'sheet.avoir.unequipped'
  | 'sheet.avoir.equip'
  | 'sheet.avoir.unequip'
  | 'sheet.avoir.attuned'
  | 'sheet.avoir.add.addedTitle'
  | 'sheet.avoir.add.addedSub'
  | 'sheet.avoir.add.failTitle'
  | 'sheet.avoir.add.browseTitle'
  | 'sheet.avoir.add.customTitle'
  | 'sheet.avoir.add.browseSubtitle'
  | 'sheet.avoir.add.customSubtitle'
  | 'sheet.avoir.add.searchPlaceholder'
  | 'sheet.avoir.add.noMatch'
  | 'sheet.avoir.add.customCta'
  | 'sheet.avoir.add.confirm'
  | 'sheet.avoir.coin.cu'
  | 'sheet.avoir.coin.ar'
  | 'sheet.avoir.coin.el'
  | 'sheet.avoir.coin.or'
  | 'sheet.avoir.coin.pl'
  | 'sheet.avoir.weight.title'
  | 'sheet.avoir.weight.normal'
  | 'sheet.avoir.weight.encumbered'
  | 'sheet.avoir.weight.heavilyEncumbered'
  | 'sheet.avoir.coins.title'
  | 'sheet.avoir.coins.purseToast'
  | 'sheet.avoir.coins.updated'
  | 'sheet.avoir.coins.editAria'
  | 'sheet.avoir.coins.totalValue'
  | 'sheet.avoir.inv.title'
  | 'sheet.avoir.inv.addCta'
  | 'sheet.avoir.inv.searchPlaceholder'
  | 'sheet.avoir.inv.empty'
  | 'sheet.avoir.inv.noMatchQuery'
  | 'sheet.avoir.inv.unresolved'
  | 'sheet.avoir.inv.notFound'
  | 'sheet.avoir.inv.acMeta'
  | 'sheet.avoir.inv.acDexMeta'
  | 'sheet.avoir.group.weapon'
  | 'sheet.avoir.group.armor'
  | 'sheet.avoir.group.tool'
  | 'sheet.avoir.group.pack'
  | 'sheet.avoir.group.gear'
  | 'sheet.avoir.group.magic'
  | 'sheet.avoir.group.misc'
  | 'sheet.avoir.group.unknown'
  | 'sheet.avoir.detail.removed'
  | 'sheet.avoir.detail.attuneLimitTitle'
  | 'sheet.avoir.detail.attuneLimitSub'
  | 'sheet.avoir.detail.linkBroken'
  | 'sheet.avoir.detail.linkEstablished'
  | 'sheet.avoir.detail.unresolvedItem'
  | 'sheet.avoir.detail.weight'
  | 'sheet.avoir.detail.cost'
  | 'sheet.avoir.detail.damage'
  | 'sheet.avoir.detail.ac'
  | 'sheet.avoir.detail.acDex'
  | 'sheet.avoir.detail.noDescription'
  | 'sheet.avoir.detail.decreaseQty'
  | 'sheet.avoir.detail.increaseQty'
  | 'sheet.avoir.detail.notes'
  | 'sheet.avoir.detail.notesPlaceholder'
  | 'sheet.avoir.detail.unlink'
  | 'sheet.avoir.detail.link'
  | 'sheet.avoir.detail.confirmRemove'
  | 'sheet.avoir.detail.remove'
  | 'sheet.avoir.customForm.invalidSchema'
  | 'sheet.avoir.customForm.created'
  | 'sheet.avoir.customForm.failTitle'
  | 'sheet.avoir.customForm.name'
  | 'sheet.avoir.customForm.category'
  | 'sheet.avoir.customForm.weight'
  | 'sheet.avoir.customForm.description'
  | 'sheet.avoir.customForm.descPlaceholder'
  | 'sheet.avoir.customForm.submit'
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
  | 'customContent.list.export'
  | 'customContent.list.exportTip'
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
  | 'customContent.category.magic-items'
  | 'customContent.category.monsters'
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
  | 'customContent.editor.magicItems.add'
  | 'customContent.editor.magicItems.empty'
  | 'customContent.editor.magicItems.remove'
  | 'customContent.editor.magicItemForm.title'
  | 'customContent.editor.magicItemForm.id'
  | 'customContent.editor.magicItemForm.idHelper'
  | 'customContent.editor.magicItemForm.nameFr'
  | 'customContent.editor.magicItemForm.nameEn'
  | 'customContent.editor.magicItemForm.category'
  | 'customContent.editor.magicItemForm.categoryPlaceholder'
  | 'customContent.editor.magicItemForm.rarity'
  | 'customContent.editor.magicItemForm.rarityPlaceholder'
  | 'customContent.editor.magicItemForm.attunement'
  | 'customContent.editor.magicItemForm.attunementHelper'
  | 'customContent.editor.magicItemForm.magicDescriptionFr'
  | 'customContent.editor.magicItemForm.magicDescriptionEn'
  | 'customContent.editor.magicItemForm.magicDescriptionHelper'
  | 'customContent.editor.magicItemForm.hasDescription'
  | 'customContent.editor.magicItemForm.hasDescriptionHelper'
  | 'customContent.editor.magicItemForm.descriptionFr'
  | 'customContent.editor.magicItemForm.descriptionEn'
  | 'customContent.editor.magicItemForm.cancel'
  | 'customContent.editor.magicItemForm.confirm'
  | 'customContent.editor.magicItemForm.error.idRequired'
  | 'customContent.editor.magicItemForm.error.idFormat'
  | 'customContent.editor.magicItemForm.error.nameFrRequired'
  | 'customContent.editor.magicItemForm.error.categoryRequired'
  | 'customContent.editor.magicItemForm.error.rarityRequired'
  | 'customContent.editor.magicItemForm.error.magicDescriptionRequired'
  | 'customContent.editor.monsters.add'
  | 'customContent.editor.monsters.empty'
  | 'customContent.editor.monsters.remove'
  | 'customContent.editor.monsterForm.title'
  | 'customContent.editor.monsterForm.id'
  | 'customContent.editor.monsterForm.idHelper'
  | 'customContent.editor.monsterForm.nameFr'
  | 'customContent.editor.monsterForm.nameEn'
  | 'customContent.editor.monsterForm.size'
  | 'customContent.editor.monsterForm.type'
  | 'customContent.editor.monsterForm.typeHelper'
  | 'customContent.editor.monsterForm.alignmentFr'
  | 'customContent.editor.monsterForm.alignmentEn'
  | 'customContent.editor.monsterForm.ac'
  | 'customContent.editor.monsterForm.hpAvg'
  | 'customContent.editor.monsterForm.hpFormula'
  | 'customContent.editor.monsterForm.speedLegend'
  | 'customContent.editor.monsterForm.speedWalk'
  | 'customContent.editor.monsterForm.speedFly'
  | 'customContent.editor.monsterForm.speedSwim'
  | 'customContent.editor.monsterForm.speedClimb'
  | 'customContent.editor.monsterForm.speedBurrow'
  | 'customContent.editor.monsterForm.abilitiesLegend'
  | 'customContent.editor.monsterForm.sensesLegend'
  | 'customContent.editor.monsterForm.passivePerception'
  | 'customContent.editor.monsterForm.darkvision'
  | 'customContent.editor.monsterForm.blindsight'
  | 'customContent.editor.monsterForm.tremorsense'
  | 'customContent.editor.monsterForm.truesight'
  | 'customContent.editor.monsterForm.cr'
  | 'customContent.editor.monsterForm.crHelper'
  | 'customContent.editor.monsterForm.xp'
  | 'customContent.editor.monsterForm.resistances'
  | 'customContent.editor.monsterForm.immunities'
  | 'customContent.editor.monsterForm.vulnerabilities'
  | 'customContent.editor.monsterForm.conditionImmunities'
  | 'customContent.editor.monsterForm.languages'
  | 'customContent.editor.monsterForm.listHelper'
  | 'customContent.editor.monsterForm.listEmpty'
  | 'customContent.editor.monsterForm.listAdd'
  | 'customContent.editor.monsterForm.traits'
  | 'customContent.editor.monsterForm.traitAdd'
  | 'customContent.editor.monsterForm.actions'
  | 'customContent.editor.monsterForm.actionAdd'
  | 'customContent.editor.monsterForm.reactions'
  | 'customContent.editor.monsterForm.reactionAdd'
  | 'customContent.editor.monsterForm.legendaryActions'
  | 'customContent.editor.monsterForm.legendaryAdd'
  | 'customContent.editor.monsterForm.namedEmpty'
  | 'customContent.editor.monsterForm.namedRemove'
  | 'customContent.editor.monsterForm.entryNameFr'
  | 'customContent.editor.monsterForm.entryNameEn'
  | 'customContent.editor.monsterForm.entryDescFr'
  | 'customContent.editor.monsterForm.entryDescEn'
  | 'customContent.editor.monsterForm.cancel'
  | 'customContent.editor.monsterForm.confirm'
  | 'customContent.editor.monsterForm.error.idRequired'
  | 'customContent.editor.monsterForm.error.idFormat'
  | 'customContent.editor.monsterForm.error.nameFrRequired'
  | 'customContent.editor.monsterForm.error.typeRequired'
  | 'customContent.editor.monsterForm.error.alignmentRequired'
  | 'customContent.editor.monsterForm.error.hpFormulaRequired'
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
  | 'customContent.editor.classForm.error.multiclassMinimumOutOfRange'
  | 'customContent.editor.editMode.title'
  | 'customContent.editor.editMode.subtitle'
  | 'customContent.editor.editMode.notFound'
  | 'customContent.editor.editMode.errorTitle'
  | 'customContent.editor.editMode.back'
  | 'customContent.editor.meta.idHelperEdit'
  | 'customContent.editor.entityRow.edit'
  | 'customContent.list.edit'
  // Infobulles explicites — fiche (sheet)
  | 'sheet.tip.editPreparation'
  | 'sheet.tip.openSpellDetail'
  | 'sheet.tip.chooseSlotLevel'
  | 'sheet.tip.spellAttackRoll'
  | 'sheet.tip.castSpell'
  | 'sheet.tip.restoreAllSlots'
  | 'sheet.tip.restorePactSlots'
  | 'sheet.tip.consumeSlot'
  | 'sheet.tip.restoreSlot'
  | 'sheet.tip.openDetail'
  | 'sheet.tip.toggleInspiration'
  | 'sheet.tip.rollSave'
  | 'sheet.tip.rollSkill'
  | 'sheet.tip.closeModal'
  | 'sheet.tip.decrement'
  | 'sheet.tip.increment'
  | 'sheet.tip.toggleEquip'
  | 'sheet.tip.toggleAttune'
  | 'sheet.tip.removeItem'
  | 'sheet.tip.editCoin'
  | 'sheet.tip.addItem'
  | 'sheet.tip.createCustomItem'
  // Infobulles explicites — campagnes (campaigns)
  | 'campaigns.tip.viewStatBlock'
  | 'campaigns.tip.applyDamage'
  | 'campaigns.tip.applyHeal'
  | 'campaigns.tip.quickDamage'
  | 'campaigns.tip.quickHeal'
  | 'campaigns.tip.grantTempHp'
  | 'campaigns.tip.customCondition'
  | 'campaigns.tip.saveNote'
  | 'campaigns.tip.conditionAdd'
  | 'campaigns.tip.conditionRemove'
  | 'campaigns.tip.rollInit'
  | 'campaigns.tip.startCombat'
  | 'campaigns.tip.endTurn'
  | 'campaigns.tip.endCombat'
  | 'campaigns.tip.reroll'
  | 'campaigns.tip.controlParticipant'
  | 'campaigns.tip.previousTurn'
  | 'campaigns.tip.abortCombat'
  | 'campaigns.tip.reopenCombat'
  | 'campaigns.tip.manageEncounter'
  | 'campaigns.tip.addParticipant'
  | 'campaigns.tip.editParticipant'
  | 'campaigns.tip.removeParticipant'
  | 'campaigns.tip.openJournal'
  | 'campaigns.tip.openHandouts'
  | 'campaigns.tip.openNpcs'
  | 'campaigns.tip.openSessions'
  | 'campaigns.tip.openEncounters'
  | 'campaigns.tip.openMaps'
  | 'campaigns.tip.viewMaps'
  | 'campaigns.tip.openSettings'
  | 'campaigns.tip.promoteGm'
  | 'campaigns.tip.copyInviteCode'
  | 'campaigns.tip.shareInviteLink'
  | 'campaigns.tip.linkCharacter'
  | 'campaigns.tip.openOwnSheet'
  | 'campaigns.tip.createCharacter'
  | 'campaigns.tip.editNpc'
  | 'campaigns.tip.deleteNpc'
  | 'campaigns.tip.duplicateNpc'
  | 'campaigns.tip.editRelations'
  | 'campaigns.tip.archiveHandout'
  | 'campaigns.tip.startSession'
  | 'campaigns.tip.endSession'
  | 'campaigns.tip.applyHandoff'
  | 'campaigns.tip.handoffTarget'
  | 'campaigns.tip.removeMonsterRow'
  | 'campaigns.tip.fromBestiary'
  | 'campaigns.tip.demoteGm'
  | 'campaigns.tip.kickMember'
  | 'campaigns.tip.rotateInviteCode'
  // Infobulles explicites — carte (map)
  | 'map.tip.placeAoe'
  | 'map.tip.rotateAoeCcw'
  | 'map.tip.rotateAoeCw'
  | 'map.tip.shrinkAoe'
  | 'map.tip.growAoe'
  | 'map.tip.sphereNoRotation'
  | 'map.tip.deleteAoe'
  | 'map.tip.removeFromInitiative'
  | 'map.tip.addMonster'
  | 'map.tip.snapToGrid'
  | 'map.tip.snapNeedsGrid'
  | 'map.tip.toggleGrid'
  | 'map.tip.toggleFog'
  | 'map.tip.toggleLos'
  | 'map.tip.viewAsPlayer'
  | 'map.tip.toggleLighting'
  | 'map.tip.toggleMeasure'
  | 'map.tip.deleteMap'
  // Écrans carte (map) — communs + cloud + import + TV
  | 'map.common.loading'
  | 'map.common.loadingMap'
  | 'map.common.errorPrefix'
  | 'map.common.missingCid'
  | 'map.common.invalidSlug'
  | 'map.common.nameRequired'
  | 'map.common.slugLabel'
  | 'map.common.nameLabel'
  | 'map.common.deletePrefix'
  | 'map.common.backToCampaign'
  | 'map.badge.prototype'
  | 'map.tv.missingParams'
  | 'map.tv.notFound'
  | 'map.tv.back'
  | 'map.cloud.signedOut'
  | 'map.cloud.title'
  | 'map.cloud.campaignPrefix'
  | 'map.cloud.importLink'
  | 'map.cloud.ensureErrorPrefix'
  | 'map.cloud.createSection'
  | 'map.cloud.newMap'
  | 'map.cloud.slugPlaceholder'
  | 'map.cloud.namePlaceholder'
  | 'map.cloud.creating'
  | 'map.cloud.create'
  | 'map.cloud.loadErrorPrefix'
  | 'map.cloud.loadingMaps'
  | 'map.cloud.empty'
  | 'map.cloud.emptyMember'
  | 'map.cloud.memberIntro'
  | 'map.zoom.inAria'
  | 'map.zoom.outAria'
  | 'map.zoom.reset'
  | 'map.cloud.listAria'
  | 'map.cloud.delete'
  | 'map.import.signedOut'
  | 'map.import.parseFailedPrefix'
  | 'map.import.back'
  | 'map.import.title'
  | 'map.import.badge'
  | 'map.import.introBefore'
  | 'map.import.introAfter'
  | 'map.import.chooseFile'
  | 'map.import.statDimensions'
  | 'map.import.statWalls'
  | 'map.import.statLights'
  | 'map.import.statImage'
  | 'map.import.squaresSuffix'
  | 'map.import.verticesSuffix'
  | 'map.import.imageIncluded'
  | 'map.import.imageAbsent'
  | 'map.import.preview'
  | 'map.import.saveSection'
  | 'map.import.submitting'
  | 'map.import.submit'
  // Écran carte — import d'une image nue (2ᵉ onglet de l'import)
  | 'map.import.tabDd2vtt'
  | 'map.import.tabImage'
  | 'map.import.imageIntro'
  | 'map.import.chooseImage'
  | 'map.import.imageProcessing'
  | 'map.import.imageTooLarge'
  | 'map.import.imageFailed'
  | 'map.import.statWeight'
  | 'map.import.statScale'
  | 'map.import.imageHint'
  // Écran carte — réglages d'une carte existante (map-settings-modal)
  | 'map.settings.closeLabel'
  | 'map.settings.title'
  | 'map.settings.gridSizeLabel'
  | 'map.settings.gridSizeHelp'
  | 'map.settings.scaleLabel'
  | 'map.settings.scaleEchoPrefix'
  | 'map.settings.scaleInvalid'
  | 'map.settings.imageUrlLabel'
  | 'map.settings.imageUrlPlaceholder'
  | 'map.settings.imageUrlHelp'
  | 'map.settings.save'
  | 'map.live.settingsButton'
  | 'map.tip.openSettings'
  // Écran carte — édition de jeton (token-edit-modal) + bestiaire (monster-picker)
  | 'map.token.editTitle'
  | 'map.token.closeLabel'
  | 'map.token.portraitSection'
  | 'map.token.portraitAltPrefix'
  | 'map.token.portraitAltFallback'
  | 'map.token.imageProcessing'
  | 'map.token.imageReplace'
  | 'map.token.imageAdd'
  | 'map.token.imageRemove'
  | 'map.token.imageError'
  | 'map.token.imageHelp'
  | 'map.token.kindSection'
  | 'map.token.colorSection'
  | 'map.token.colorGroupAria'
  | 'map.token.visionSection'
  | 'map.token.visionGroupAria'
  | 'map.token.visionNone'
  | 'map.token.visionHelp'
  | 'map.token.lightSection'
  | 'map.token.lightGroupAria'
  | 'map.token.lightNoneSub'
  | 'map.token.lightRadiusPrefix'
  | 'map.token.lightHelp'
  | 'map.token.save'
  | 'map.token.duplicate'
  | 'map.token.delete'
  | 'map.token.fallbackLabel'
  | 'map.token.colorBlue'
  | 'map.token.colorRed'
  | 'map.token.colorGreen'
  | 'map.token.colorAmber'
  | 'map.token.colorPurple'
  | 'map.token.colorTurquoise'
  | 'map.token.colorPink'
  | 'map.token.colorGray'
  | 'map.token.kindPj'
  | 'map.token.kindPnj'
  | 'map.token.kindMarker'
  | 'map.token.kindHintPj'
  | 'map.token.kindHintPnj'
  | 'map.token.kindHintMarker'
  | 'map.token.visionNoneSub'
  | 'map.token.visionNormalSub'
  | 'map.token.visionDarkSub'
  | 'map.token.visionDarkExtSub'
  | 'map.token.lightNone'
  | 'map.token.lightCandle'
  | 'map.token.lightTorch'
  | 'map.token.lightLantern'
  | 'map.monsterPicker.title'
  | 'map.monsterPicker.searchPlaceholder'
  | 'map.monsterPicker.searchAria'
  | 'map.monsterPicker.loading'
  | 'map.monsterPicker.emptyTitle'
  | 'map.monsterPicker.emptyHint'
  | 'map.monsterPicker.noMatchBefore'
  | 'map.monsterPicker.noMatchAfter'
  | 'map.monsterPicker.crPrefix'
  // Écran carte live (map-live-screen) — barre d'outils MJ
  | 'map.live.signedOut'
  | 'map.live.badge'
  | 'map.live.metaTokenSingular'
  | 'map.live.metaTokenPlural'
  | 'map.live.writeErrorPrefix'
  | 'map.live.portraitTooHeavy'
  | 'map.live.fogLabel'
  | 'map.live.addFogReveal'
  | 'map.live.addFogMask'
  | 'map.live.clearFog'
  | 'map.live.lightsLabel'
  | 'map.live.lightTooltipPrefix'
  | 'map.live.lightTooltipMid'
  | 'map.live.clearLights'
  | 'map.live.aoeLabel'
  | 'map.live.clearAoe'
  | 'map.live.deleteAoe'
  | 'map.live.tokensLabel'
  | 'map.live.addPj'
  | 'map.live.addPnj'
  | 'map.live.addBestiary'
  | 'map.live.clearTokens'
  | 'map.live.tokenAbbrevPj'
  | 'map.live.tokenAbbrevPnj'
  | 'map.live.tokenAbbrevMarker'
  | 'map.live.wallsLabel'
  | 'map.live.gridToggle'
  | 'map.live.snapToggle'
  | 'map.live.fogToggleLabel'
  | 'map.live.losToggle'
  | 'map.live.playerViewToggle'
  | 'map.live.lightingToggle'
  | 'map.live.tvView'
  | 'map.live.measureLabel'
  | 'map.live.measureToggle'
  | 'map.live.distancePrefix'
  | 'map.live.clearMeasure'
  | 'map.live.measureHint'
  | 'map.light.candle'
  | 'map.light.torch'
  | 'map.light.spell'
  | 'map.light.lantern'
  | 'map.light.sunlight'
  | 'map.aoe.sphere'
  | 'map.aoe.cone'
  | 'map.aoe.line'
  | 'map.aoe.cube'
  // Prototype carte autonome (/map-proto). Anglicismes FR (Fog/AoE/tokens/Seed)
  // préservés tels quels — décision terminologique réservée à Adrien.
  | 'map.proto.title'
  | 'map.proto.importBg'
  | 'map.proto.hideGrid'
  | 'map.proto.showGrid'
  | 'map.proto.reset'
  | 'map.proto.zoomLabel'
  | 'map.proto.fogSection'
  | 'map.proto.fogOn'
  | 'map.proto.fogOff'
  | 'map.proto.viewPlayer'
  | 'map.proto.viewDm'
  | 'map.proto.brushReveal'
  | 'map.proto.brushMask'
  | 'map.proto.revealAll'
  | 'map.proto.maskAll'
  | 'map.proto.lightSection'
  | 'map.proto.lightOn'
  | 'map.proto.lightOff'
  | 'map.proto.placeTorch'
  | 'map.proto.tokenTorchPrefix'
  | 'map.proto.clearLights'
  | 'map.proto.aoeSection'
  | 'map.proto.clearAoe'
  | 'map.proto.vttSection'
  | 'map.proto.ruler'
  | 'map.proto.clearRuler'
  | 'map.proto.gridSnap'
  | 'map.proto.on'
  | 'map.proto.off'
  | 'map.proto.initiative'
  | 'map.proto.intro'
  | 'map.proto.fogIntroPrefix'
  | 'map.proto.fogStateOpaque'
  | 'map.proto.fogStateTranslucent'
  | 'map.proto.fogIntroSuffix'
  | 'map.proto.noPersistStrong'
  | 'map.proto.noPersistRest'
  | 'map.proto.initSeed'
  | 'map.proto.initNextTurn'
  | 'map.proto.initReset'
  | 'map.proto.initEmpty'
  | 'map.proto.hp'
  | 'map.proto.removeEntryPrefix'
  // Infobulles explicites — assistant + montée de niveau (wizard / level-up)
  | 'wizard.tip.rollAbilities'
  | 'wizard.tip.autofillAbilities'
  | 'wizard.tip.navPrevious'
  | 'wizard.tip.navNext'
  | 'wizard.tip.autofillSpells'
  | 'wizard.tip.recapEdit'
  | 'wizard.tip.removeClass'
  | 'wizard.tip.addClass'
  | 'wizard.tip.autofillEquipment'
  | 'wizard.tip.autofillSkills'
  | 'levelUp.tip.levelUp'
  | 'levelUp.tip.addClass'
  | 'levelUp.tip.hpAverage'
  | 'levelUp.tip.hpRoll'
  // Boutons d'entrée du flow (composant LevelUpButton)
  | 'levelUp.button.levelUp'
  | 'levelUp.button.levelUpAria'
  | 'levelUp.button.addClass'
  | 'levelUp.button.addClassAria'
  // Modale de montée de niveau / ajout de classe (multiclasse)
  | 'levelUp.mode.levelUp'
  | 'levelUp.mode.addClass'
  | 'levelUp.heading.levelUp'
  | 'levelUp.heading.addClassPrompt'
  | 'levelUp.heading.addClassTarget'
  | 'levelUp.stepIndicator.aria'
  | 'levelUp.stepIndicator.label'
  | 'levelUp.empty'
  | 'levelUp.nav.previous'
  | 'levelUp.nav.next'
  | 'levelUp.nav.confirm'
  | 'levelUp.nav.applying'
  | 'levelUp.hp.title'
  | 'levelUp.hp.intro'
  | 'levelUp.hp.average'
  | 'levelUp.hp.gain'
  | 'levelUp.hp.roll'
  | 'levelUp.hp.diePlusMod'
  | 'levelUp.subclass.title'
  | 'levelUp.subclass.intro'
  | 'levelUp.subclass.loading'
  | 'levelUp.subclass.none'
  | 'levelUp.subclass.listAria'
  | 'levelUp.asi.titleEpic'
  | 'levelUp.asi.title'
  | 'levelUp.asi.introEpic'
  | 'levelUp.asi.intro'
  | 'levelUp.asi.typeAria'
  | 'levelUp.asi.improvement'
  | 'levelUp.asi.feat'
  | 'levelUp.asi.distributionLegend'
  | 'levelUp.asi.plusTwo'
  | 'levelUp.asi.plusOneOne'
  | 'levelUp.asi.primary'
  | 'levelUp.asi.secondary'
  | 'levelUp.feat.epic'
  | 'levelUp.feat.general'
  | 'levelUp.feat.loading'
  | 'levelUp.feat.placeholder'
  | 'levelUp.feat.blockedTitle'
  | 'levelUp.prereq.level'
  | 'levelUp.prereq.ability'
  | 'levelUp.prereq.spellcasting'
  | 'levelUp.prereq.classFeature'
  | 'levelUp.pick.cantripsLabel'
  | 'levelUp.pick.cantripsHelp'
  | 'levelUp.pick.spellsLabel'
  | 'levelUp.pick.spellsHelp'
  | 'levelUp.pick.invocationsLabel'
  | 'levelUp.pick.invocationsHelp'
  | 'levelUp.pick.selectedCount'
  | 'levelUp.pick.loading'
  | 'levelUp.pick.none'
  | 'levelUp.addClass.ownedReason'
  | 'levelUp.addClass.pickTitle'
  | 'levelUp.addClass.pickIntro'
  | 'levelUp.addClass.blockedTitle'
  | 'levelUp.addClass.selectFirst'
  | 'levelUp.addClass.defNotFound'
  | 'levelUp.addClass.subChoicesTitle'
  | 'levelUp.addClass.noSubChoices'
  | 'levelUp.addClass.subChoicesTitleClass'
  | 'levelUp.addClass.subChoicesIntro'
  | 'levelUp.addClass.divineOrder'
  | 'levelUp.addClass.primalOrder'
  | 'levelUp.addClass.fightingStyle'
  | 'levelUp.addClass.weaponMasteryLegend'
  | 'levelUp.addClass.weaponMasteryHelper'
  | 'levelUp.addClass.weaponMasterySummary'
  | 'levelUp.addClass.invocationLegend'
  | 'levelUp.addClass.invocationHelper'
  | 'levelUp.addClass.spellbookLegend'
  | 'levelUp.addClass.spellbookHelper'
  | 'levelUp.addClass.spellSchoolSummary'
  | 'levelUp.addClass.upcomingBadge'
  | 'levelUp.addClass.upcomingBody'
  | 'levelUp.addClass.missingHint'
  // Infobulles explicites — menu radial, dés, journal, outils MJ
  | 'radialMenu.tip.fab'
  | 'radialMenu.tip.back'
  | 'radialMenu.tip.close'
  | 'dice.tip.closeHistory'
  | 'dice.history.title'
  // Menu d'options de jet — partagé par sauvegardes, compétences, initiative,
  // jets de mort et attaques de sort (M21/M22/M23)
  | 'dice.options.bonus'
  | 'dice.options.bonusAria'
  | 'dice.options.useInspiration'
  | 'dice.options.inspirationNote'
  | 'dice.options.title'
  | 'dice.options.aria'
  // Jet libre — une formule tapée à la main (M20)
  | 'dice.free.title'
  | 'dice.free.aria'
  | 'dice.free.label'
  | 'dice.free.placeholder'
  | 'dice.free.hint'
  | 'dice.free.invalid'
  | 'dice.free.submit'
  | 'dice.free.cancel'
  | 'dice.free.rollLabel'
  | 'sheet.fab.freeRoll'
  // Modale de jet physique (plan 12.5)
  | 'dice.physical.header'
  | 'dice.physical.rollPrompt'
  | 'dice.physical.withAdvantage'
  | 'dice.physical.withDisadvantage'
  | 'dice.physical.kept'
  | 'dice.physical.faceAria'
  | 'dice.physical.total'
  | 'dice.physical.crit'
  | 'dice.physical.fumble'
  | 'dice.physical.passTip'
  | 'dice.physical.pass'
  | 'dice.physical.validateTip'
  | 'dice.physical.validate'
  | 'dice.hitMiss.eyebrow'
  | 'dice.hitMiss.question'
  | 'dice.hitMiss.miss'
  | 'dice.hitMiss.hit'
  | 'dice.hitMiss.missTip'
  | 'dice.hitMiss.hitTip'
  | 'dice.history.closeLabel'
  | 'dice.history.empty'
  | 'dice.history.modeSaveError'
  | 'dice.history.modeSaveErrorSub'
  | 'dm.tip.advNormal'
  | 'dm.tip.advAdvantage'
  | 'dm.tip.advDisadvantage'
  | 'dm.tip.secretRoll'
  | 'journal.tip.export'
  | 'journal.tip.exportSession'
  | 'journal.tip.compile'
  | 'journal.tip.edit'
  | 'journal.tip.recompile';

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
    'alignment.LB': 'Loyal Bon',
    'alignment.NB': 'Neutre Bon',
    'alignment.CB': 'Chaotique Bon',
    'alignment.LN': 'Loyal Neutre',
    'alignment.N': 'Neutre',
    'alignment.CN': 'Chaotique Neutre',
    'alignment.LM': 'Loyal Mauvais',
    'alignment.NM': 'Neutre Mauvais',
    'alignment.CM': 'Chaotique Mauvais',
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
    // Codex — navigateur de contenu SRD (plan 19)
    'codex.title': 'Le Codex',
    'codex.subtitle': 'Tout le contenu du SRD 5.2.1, à portée de main.',
    'codex.overlay.subtitle': 'Consulter une règle sans quitter la partie.',
    'codex.overlay.close': 'Fermer le Codex',
    'codex.nav.cta': 'Le Codex',
    'codex.loading': 'Invocation du contenu…',
    'codex.empty': 'Aucune entrée ne correspond à ta recherche.',
    'codex.result.singular': 'résultat',
    'codex.result.plural': 'résultats',
    'codex.cat.aria': 'Catégories du Codex',
    'codex.cat.search': 'Recherche',
    'codex.search.all': 'Rechercher dans tout le Codex…',
    'codex.search.allHint':
      'Saisis au moins deux lettres pour chercher dans toutes les catégories à la fois.',
    'codex.cat.spells': 'Sorts',
    'codex.cat.feats': 'Dons',
    'codex.cat.invocations': 'Invocations',
    'codex.cat.conditions': 'États',
    'codex.cat.magicItems': 'Objets magiques',
    'codex.cat.items': 'Équipement',
    'codex.cat.monsters': 'Bestiaire',
    'codex.search.monsters': 'Rechercher un monstre…',
    'codex.monster.allSizes': 'Toutes tailles',
    'codex.monster.senses': 'Sens',
    'codex.cat.ancestries': 'Espèces',
    'codex.cat.backgrounds': 'Historiques',
    'codex.cat.classes': 'Classes',
    'codex.search.spells': 'Rechercher un sort…',
    'codex.search.feats': 'Rechercher un don…',
    'codex.search.invocations': 'Rechercher une invocation…',
    'codex.search.conditions': 'Rechercher un état…',
    'codex.search.magicItems': 'Rechercher un objet magique…',
    'codex.search.items': 'Rechercher un équipement…',
    'codex.search.ancestries': 'Rechercher une espèce…',
    'codex.search.backgrounds': 'Rechercher un historique…',
    'codex.search.classes': 'Rechercher une classe…',
    'codex.detail.prerequisite': 'Prérequis',
    'codex.detail.prereqLevel': 'Niveau requis',
    'codex.spell.allLevels': 'Tous niveaux',
    'codex.spell.allSchools': 'Toutes écoles',
    'codex.spell.classesLabel': 'Disponible pour',
    'codex.item.allRarities': 'Toutes raretés',
    'codex.item.allCategories': 'Toutes catégories',
    'codex.item.weight': 'Poids',
    'codex.item.cost': 'Coût',
    'codex.item.damage': 'Dégâts',
    'codex.item.ac': 'Classe d’armure',
    'codex.item.properties': 'Propriétés',
    'codex.item.attunement': 'Harmonisation',
    'codex.item.attunementRequired': 'Harmonisation requise',
    'codex.species.size': 'Taille',
    'codex.species.speed': 'Vitesse',
    'codex.species.asi': 'Augmentations de caractéristique',
    'codex.common.languages': 'Langues',
    'codex.common.traits': 'Traits',
    'codex.bg.skills': 'Maîtrises de compétences',
    'codex.bg.coins': 'Pièces de départ',
    'codex.class.hitDie': 'Dé de vie',
    'codex.class.primaryAbility': 'Caractéristique principale',
    'codex.class.savingThrows': 'Jets de sauvegarde',
    'codex.class.skills': 'Compétences',
    'codex.class.chooseAmong': 'au choix parmi',
    'codex.class.features': 'Aptitudes de classe',
    'size.tiny': 'Très petite',
    'size.small': 'Petite',
    'size.medium': 'Moyenne',
    'size.large': 'Grande',
    'size.huge': 'Très grande',
    'size.gargantuan': 'Gigantesque',
    // Compte / préférences (plan 35 — amorce)
    'account.title': 'Mon compte',
    'account.subtitle': 'Profil et préférences de jeu.',
    'account.profile.title': 'Profil',
    'account.profile.anonymous': 'Aventurier anonyme',
    'account.profile.anonymousHint':
      'Tes données vivent sur cet appareil. Lie un compte pour les retrouver ailleurs.',
    'account.profile.emailLabel': 'Adresse e-mail',
    'account.profile.providerLabel': 'Connexion',
    'account.provider.google': 'Google',
    'account.provider.password': 'E-mail / mot de passe',
    'account.provider.anonymous': 'Invité',
    'account.prefs.title': 'Préférences',
    'account.dice.title': 'Mode de dés',
    'account.dice.hint':
      'Comment tu lances : l’app tire les dés, ou tu les lances en vrai et saisis le résultat.',
    'account.dice.digital': 'Numérique',
    'account.dice.digitalHint': 'L’app lance les dés pour toi.',
    'account.dice.physical': 'Physique',
    'account.dice.physicalHint': 'Tu lances tes dés et saisis les faces ; l’app calcule.',
    'account.dice.followCampaign': 'Suivre le mode de la campagne',
    'account.dice.followCampaignHint':
      'Adopter automatiquement le mode de dés défini par le meneur.',
    'account.locale.title': 'Langue',
    'account.locale.hint': 'Choisis la langue de l’interface et du contenu.',
    'account.locale.fr': 'Français',
    'account.locale.en': 'Anglais',
    'account.content.title': 'Contenu personnalisé',
    'account.content.hint':
      'Importe des packs de contenu (sorts, classes, objets, monstres…) ou compose les tiens pour les utiliser en jeu.',
    'account.content.cta': 'Gérer mes packs',
    'account.signOut': 'Se déconnecter',
    'account.signOutConfirm': 'Confirmer la déconnexion',
    'account.cancel': 'Annuler',
    'auth.nudge.title': 'Sauvegarde ton compte',
    'auth.nudge.body':
      'Ton compte est provisoire. Lie-le à Google ou à un e-mail pour ne pas perdre tes personnages ni tes campagnes si tu changes d’appareil.',
    'auth.nudge.cta': 'Sécuriser mon compte',
    'account.link.title': 'Sauvegarder ton compte',
    'account.link.hint':
      'Tu joues en tant qu’invité : tes personnages et campagnes ne vivent que sur cet appareil. Lie un compte pour les retrouver ailleurs et ne rien perdre.',
    'account.link.google': 'Continuer avec Google',
    'account.link.or': 'ou',
    'account.link.emailLabel': 'Adresse e-mail',
    'account.link.emailPlaceholder': 'toi@exemple.fr',
    'account.link.passwordLabel': 'Mot de passe',
    'account.link.passwordPlaceholder': '6 caractères minimum',
    'account.link.emailCta': 'Lier avec un e-mail',
    'account.link.linking': 'Liaison…',
    'account.link.success': 'Compte lié. Tes données sont désormais sauvegardées.',
    'account.link.error.emailInUse':
      'Cette adresse e-mail est déjà utilisée par un autre compte.',
    'account.link.error.credentialInUse':
      'Ce compte est déjà lié à un autre profil.',
    'account.link.error.weakPassword':
      'Le mot de passe doit contenir au moins 6 caractères.',
    'account.link.error.invalidEmail': 'Adresse e-mail invalide.',
    'account.link.error.popupClosed':
      'La fenêtre Google s’est fermée avant la fin. Réessaie.',
    'account.link.error.generic': 'La liaison n’a pas abouti. Réessaie.',
    // Accueil — hub de navigation
    'home.hub.title': 'Explorer',
    'home.ongoing.label': 'En cours',
    'home.ongoing.kindEncounter': 'Combat',
    'home.ongoing.kindSession': 'Séance',
    'home.ongoing.round': 'Manche {n}',
    'home.ongoing.sessionNumber': 'Séance {n}',
    'home.ongoing.cta': 'Reprendre',
    'home.draft.label': 'Création commencée',
    'home.draft.unnamed': 'Héros sans nom',
    'home.draft.step': 'Étape {n} sur {total} · {step}',
    'home.draft.resume': 'Continuer',
    'home.draft.resumeAria': 'Continuer la création de',
    'home.draft.discard': 'Abandonner',
    'home.draft.discardAria': 'Abandonner le brouillon de',
    'home.hub.codex.sub': 'Sorts, objets, espèces, classes…',
    'home.hub.campaigns.sub': 'Rejoins ou crée une table.',
    // Wizard (plan 05)
    'wizard.title': 'Créer un personnage',
    'wizard.campaignLink.banner':
      'À la fin, ce personnage rejoindra automatiquement ta campagne.',
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
    'wizard.label.droppedDie': 'dé éliminé',
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
    // Variantes courtes pour la grille compacte de la fiche (mobile).
    'spell.metaShort.castingTime': 'Temps',
    'spell.metaShort.components': 'Compos.',
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
    'sheet.campaignLink': 'Ma campagne',
    'sheet.turnBanner.label': 'C’est à vous de jouer',
    'sheet.turnBanner.sub': 'Round {n} · {name}',
    'sheet.turnBanner.aria': 'Rejoindre le combat en cours, c’est à vous de jouer',
    'sheet.error.title': 'Erreur de chargement',
    'sheet.statusStrip.aria': 'Statistiques vitales',
    'sheet.modeTabs.aria': 'Sections de la fiche',
    'sheet.hero.level': 'Niveau {n}',
    'sheet.stat.hp': 'PV',
    'sheet.stat.ac': 'CA',
    'sheet.stat.init': 'Init',
    'sheet.stat.speed': 'Vit.',
    'sheet.stat.editInit': 'Modifier l’initiative',
    'sheet.stat.editSpeed': 'Modifier la vitesse (en mètres)',
    'sheet.stat.passivePerception': 'Perc. passive',
    'sheet.combat.hitDice.title': 'Dés de vie',
    'sheet.combat.hitDice.spend': 'Repos court',
    'sheet.combat.hitDice.spending': '…',
    'sheet.combat.hitDice.spendLabel': 'Dépenser un dé de vie ({class})',
    'sheet.combat.hitDice.restToast': 'Repos court',
    'sheet.combat.longRest.button': 'Repos long',
    'sheet.combat.longRest.confirm': 'Confirmer le repos long ?',
    'sheet.combat.longRest.toastTitle': 'Repos long',
    'sheet.combat.longRest.grittyNote': 'Réalisme rugueux : un repos long dure 7 jours.',
    'sheet.combat.longRest.slowHealingNote':
      'Guérison naturelle lente : dépensez vos dés de vie pour récupérer des PV.',
    'sheet.combat.longRest.hpPart': '+{n} PV',
    'sheet.combat.longRest.hitDicePart': '+{n} dés de vie',
    'sheet.combat.longRest.exhaustionPart': '−1 épuisement',
    'sheet.combat.rest.resourcesPart': '{n} réserves',
    'sheet.combat.shortRest.button': 'Repos court',
    'sheet.combat.shortRest.confirm': 'Confirmer le repos court ?',
    'sheet.combat.shortRest.toastTitle': 'Repos court',
    'sheet.combat.shortRest.toastNone': 'Rien à recharger pour l’instant.',
    'sheet.combat.shortRest.hint':
      'Recharge les aptitudes à repos court. Dépensez vos dés de vie ci-dessus pour récupérer des PV.',
    'sheet.combat.shortRest.pactNote': 'Emplacements de pacte rechargés.',
    'sheet.combat.shortRest.grittyNote': 'Réalisme rugueux : un repos court dure 8 heures.',
    'sheet.combat.resources.title': 'Réserves de classe',
    'sheet.combat.resources.spend': 'Dépenser',
    'sheet.combat.resources.restore': 'Récupérer',
    'sheet.combat.resources.spendLabel': 'Dépenser un point de {resource}',
    'sheet.combat.resources.restoreLabel': 'Récupérer un point de {resource}',
    'sheet.combat.resources.editMaxLabel': 'Modifier le maximum de {resource}',
    'sheet.combat.resources.restoresShort': 'Repos court',
    'sheet.combat.resources.restoresLong': 'Repos long',
    'sheet.combat.resources.rage': 'Rage',
    'sheet.combat.resources.secondWind': 'Second souffle',
    'sheet.combat.resources.actionSurge': 'Fougue',
    'sheet.combat.resources.channelDivinity': 'Conduit divin',
    'sheet.combat.resources.layOnHands': 'Imposition des mains',
    'sheet.combat.resources.wildShape': 'Forme sauvage',
    'sheet.combat.resources.sorceryPoints': 'Points de sorcellerie',
    'sheet.combat.resources.focusPoints': 'Points de focalisation',
    'sheet.combat.exhaustion.title': 'Épuisement',
    'sheet.combat.exhaustion.none': 'Aucun épuisement',
    'sheet.combat.exhaustion.level': 'Niveau {n}',
    'sheet.combat.exhaustion.penalty': 'Tests d20 −{d20} · Vitesse −{speed} m',
    'sheet.combat.exhaustion.death': 'Niveau 6 : mort.',
    'sheet.combat.exhaustion.decrease': 'Diminuer l’épuisement',
    'sheet.combat.exhaustion.increase': 'Augmenter l’épuisement',
    'sheet.combat.exhaustion.readRule': 'Lire la règle',
    'sheet.combat.condition.remove': 'Retirer cet état',
    'sheet.combat.concentration.title': 'Concentration',
    'sheet.combat.concentration.cantrip': 'Sort mineur',
    'sheet.combat.concentration.castAt': 'Lancé au niveau {n}',
    'sheet.combat.concentration.damageRule':
      'Sur dégât : jet de sauvegarde de Constitution, DD 10 ou la moitié des dégâts subis (le plus élevé).',
    'sheet.combat.concentration.break': 'Rompre la concentration',
    'sheet.combat.concentration.rollSave': 'Jet de Constitution',
    'sheet.combat.concentration.broken': 'Concentration rompue',
    'sheet.combat.concentration.unknownSpell': 'Sort en cours',
    'sheet.combat.concentration.checkBig': 'DD {dc}',
    'sheet.combat.concentration.checkSub':
      'Jet de sauvegarde de Constitution pour la maintenir.',
    'sheet.combat.concentration.lostUnconscious': 'Concentration rompue · inconscient',
    // Mode Combat — cartes, toasts et libellés a11y
    'sheet.combat.uses': 'Utilisations',
    'sheet.combat.perLongRest': 'Par repos long',
    'sheet.combat.death.rollLabel': 'Jet de mort',
    'sheet.combat.death.revivedTitle': 'Réveil miraculeux !',
    'sheet.combat.death.revivedSub': '{name} se relève à 1 PV',
    'sheet.combat.death.stabilizedTitle': 'Stabilisé(e)',
    'sheet.combat.death.stabilizedSub': '{name} reste à 0 PV mais ne meurt pas',
    'sheet.combat.death.deadTitle': 'Mort confirmée',
    'sheet.combat.death.deadSub': '{name} s’éteint',
    'sheet.combat.death.twoFails': '+2 échecs',
    'sheet.combat.death.oneSuccess': '+1 succès',
    'sheet.combat.death.oneFail': '+1 échec',
    'sheet.combat.death.reviveTitle': 'Ressuscité(e) !',
    'sheet.combat.death.reviveSub': '{name} revient à la vie',
    'sheet.combat.death.headingDead': '✦ Mort ✦',
    'sheet.combat.death.headingDying': '✦ Agonie ✦',
    'sheet.combat.death.proseDead': '{name} a succombé. Seule la résurrection peut le ramener.',
    'sheet.combat.death.proseDying':
      '{name} lutte contre la fin. Tente trois sauvegardes contre la mort.',
    'sheet.combat.death.successes': 'Succès',
    'sheet.combat.death.failures': 'Échecs',
    'sheet.combat.death.rollButton': 'Lancer une sauvegarde',
    'sheet.combat.death.reviveButton': '✦ Ressusciter ✦',
    'sheet.combat.death.dmOnlyRevive': 'Seul le MJ peut tenter la résurrection.',
    'sheet.combat.hp.cardTitle': 'Vitalité',
    'sheet.combat.hp.damageTakenTitle': 'Dégâts subis',
    'sheet.combat.hp.fraction': '{current}/{max} PV',
    'sheet.combat.hp.massiveDeathTitle': 'Mort foudroyante',
    'sheet.combat.hp.massiveDeathSub': 'Dégâts massifs — pas de jet de mort',
    'sheet.combat.hp.healTitle': 'Soin',
    'sheet.combat.hp.tempTitle': 'PV temporaires',
    'sheet.combat.hp.tempBuffer': 'Tampon avant les PV',
    'sheet.combat.hp.tempRemoved': 'PV temporaires retirés',
    'sheet.combat.hp.tempEdit': 'Modifier les PV temporaires ({n} actuellement)',
    'sheet.combat.hp.tempShort': 'PV temp.',
    'sheet.combat.hp.tempAdd': '+ PV temp.',
    'sheet.combat.hp.liveLabel': '{current} sur {max} points de vie, état {band}',
    'sheet.combat.hp.controlsHint': 'Appui bref = ±1 · Appui long = pavé numérique',
    'sheet.combat.hp.band.healthy': 'Sain',
    'sheet.combat.hp.band.wounded': 'Blessé',
    'sheet.combat.hp.band.critical': 'Critique',
    'sheet.combat.hp.band.dead': 'Inconscient',
    'sheet.combat.numberpad.title.damage': 'Dégâts',
    'sheet.combat.numberpad.title.heal': 'Soigner',
    'sheet.combat.numberpad.title.temp': 'PV temporaires',
    'sheet.combat.numberpad.title.max': 'Maximum de PV',
    'sheet.combat.numberpad.commit.damage': 'Appliquer',
    'sheet.combat.numberpad.commit.heal': 'Soigner',
    'sheet.combat.numberpad.commit.temp': 'Poser',
    'sheet.combat.numberpad.commit.max': 'Fixer',
    'sheet.combat.hp.maxEdit': 'Modifier le maximum de PV (actuellement {n})',
    'sheet.combat.numberpad.cancel': 'Annuler',
    'sheet.combat.numberpad.full': 'Plein ({max})',
    'sheet.combat.attacks.cardTitle': 'Attaques',
    'sheet.combat.attacks.emptyPre': 'Aucune arme équipée. Va dans ',
    'sheet.combat.attacks.emptyPost': ' pour équiper une arme.',
    'sheet.combat.attacks.ranged': 'Distance',
    'sheet.combat.attacks.melee': 'Mêlée',
    'sheet.combat.attacks.menuAdvantage': 'Avantage',
    'sheet.combat.attacks.menuDisadvantage': 'Désav.',
    'sheet.combat.attacks.menuCrit': 'Crit',
    'sheet.combat.hud.action': 'Action',
    'sheet.combat.hud.bonus': 'Bonus',
    'sheet.combat.hud.reaction': 'Réaction',
    'sheet.combat.hud.endTurnTitle': 'Fin du tour',
    'sheet.combat.hud.endTurnSub': 'Économie d’action réinitialisée',
    'sheet.combat.hud.inspirationTitle': 'Inspiration héroïque',
    'sheet.combat.hud.inspirationGranted': 'Octroyée — relancez un test au choix.',
    'sheet.combat.hud.inspirationRemoved': 'Retirée.',
    'sheet.combat.hud.initiativeLabel': 'Initiative',
    'sheet.combat.hud.initShort': 'Init.',
    'sheet.combat.hud.inspirationGrantAria': 'Octroyer l’Inspiration héroïque',
    'sheet.combat.hud.inspirationRemoveAria': 'Retirer l’Inspiration héroïque',
    'sheet.combat.hud.inspirationButton': 'Inspiration',
    'sheet.combat.hud.endTurnButton': 'Fin du tour',
    'sheet.combat.breath.cardTitle': 'Souffle draconique',
    'sheet.combat.breath.regionLabel': 'Souffle draconique du dragon {dragon}',
    'sheet.combat.breath.dragonLabel': 'Dragon {dragon}',
    'sheet.combat.breath.shape': 'Cône de 4,50 m ou Ligne de 9 m × 1,50 m',
    'sheet.combat.breath.statDamage': 'Dégâts',
    'sheet.combat.breath.statDc': 'DD Dextérité',
    'sheet.combat.breath.statResist': 'Résistance',
    'sheet.combat.breath.cadence': 'Action Attaque · par repos long',
    'sheet.combat.breath.spendLabel':
      'Dépenser une utilisation de Souffle draconique (dragon {dragon})',
    'sheet.combat.breath.restoreLabel':
      'Récupérer une utilisation de Souffle draconique (dragon {dragon})',
    'sheet.combat.conditions.cardTitle': 'États',
    'sheet.combat.conditions.removed': 'État retiré',
    'sheet.combat.conditions.applied': 'État appliqué',
    'sheet.combat.conditions.detailAria': 'Voir le détail de l’état {name}',
    'sheet.combat.conditions.none': 'Aucun état actif.',
    'sheet.combat.conditions.add': '+ État',
    'sheet.combat.conditions.searchPlaceholder': 'Rechercher un état…',
    'sheet.combat.conditions.noMatch': 'Aucun état correspondant.',
    'sheet.combat.fightingStyle.cardTitle': 'Style de combat',
    'sheet.combat.fightingStyle.regionLabel': 'Style de combat : {name}',
    'sheet.combat.giant.cardTitle': 'Ascendance gigante',
    'sheet.combat.giant.regionLabel': 'Trait Ascendance gigante : {name}',
    'sheet.combat.giant.spendLabel':
      'Dépenser une utilisation d’Ascendance gigante ({name})',
    'sheet.combat.giant.restoreLabel':
      'Récupérer une utilisation d’Ascendance gigante ({name})',
    'sheet.combat.party.cardTitle': 'Compagnons',
    'sheet.combat.party.comingSoon':
      'Liste des compagnons disponible quand la synchronisation de campagne arrivera (plan 16).',
    'sheet.combat.party.noCampaign':
      'Aucune campagne rejointe. Rejoins ou crée une campagne pour voir tes compagnons.',
    'sheet.combat.slots.cardTitle': 'Sortilèges',
    'sheet.combat.slots.toastTitle': 'Emplacement niv. {n}',
    'sheet.combat.slots.levelShort': 'Niv. {n}',
    'sheet.combat.slots.dotConsume': 'Consommer un emplacement (appui long pour restaurer)',
    'sheet.combat.slots.dotConsumed': 'Emplacement consommé (appui long pour restaurer)',
    'sheet.essence.languages.title': 'Langues',
    'sheet.essence.proficiencies.title': 'Maîtrises',
    'sheet.essence.proficiencies.armor': 'Armures',
    'sheet.essence.proficiencies.weapons': 'Armes',
    'sheet.essence.proficiencies.tools': 'Outils',
    // « Don d'origines » : terme officiel du SRD FR (FR_SRD_CC_v5.2.1.txt,
    // titres de section l. 9500/9506/9534). Le don lui-même garde son nom
    // depuis le bundle (ex. « Don : Initié à la magie (Clerc) »).
    'sheet.essence.originFeat.title': "Don d'origines",
    'sheet.essence.originFeat.openLabel': "Don d'origines : {name}",
    'sheet.essence.ancestryTraits.title': "Traits d'ascendance",
    'sheet.essence.ancestryTraits.openLabel': 'Trait : {name}',
    'sheet.essence.classFeatures.title': 'Aptitudes de classe',
    'sheet.essence.classFeatures.openLabel': 'Aptitude : {name}',
    'sheet.essence.classFeatures.level': 'Niv. {level}',
    'sheet.mode.combat': 'Combat',
    'sheet.mode.essence': 'Essence',
    'sheet.mode.magie': 'Magie',
    'sheet.mode.avoir': 'Avoir',
    'sheet.mode.ame': 'Âme',
    'combat.hud.tip.action':
      'Marque ton action comme utilisée ce tour-ci (retape pour annuler).',
    'combat.hud.tip.bonus':
      'Marque ton action bonus comme utilisée ce tour-ci (retape pour annuler).',
    'combat.hud.tip.reaction':
      'Marque ta réaction comme utilisée ce tour-ci (retape pour annuler).',
    'combat.hud.tip.initiative':
      "Lance ton initiative pour déterminer ta place dans l'ordre du combat.",
    'combat.hud.label': 'Tableau de bord de combat',
    'combat.hud.rollInitiative': "Lancer l'initiative",
    'combat.hp.tempTip': 'Ajouter des PV temporaires (tampon avant les PV)',
    'combat.hp.tempLabel': 'Ajouter des PV temporaires',
    'combat.hp.damageTip': 'Subir 1 dégât — appui long pour saisir un montant',
    'combat.hp.damageLabel': 'Subir 1 dégât (appui long pour saisir un montant)',
    'combat.hp.healTip': 'Soigner de 1 PV — appui long pour saisir un montant',
    'combat.hp.healLabel': 'Soigner de 1 PV (appui long pour saisir un montant)',
    'combat.hud.tip.inspirationGrant':
      'Octroie l’Inspiration héroïque : tu pourras la dépenser pour relancer un test.',
    'combat.hud.tip.inspirationRemove': 'Retire l’Inspiration héroïque.',
    'combat.hud.tip.endTurn': 'Termine ton tour et réinitialise ton économie d’action.',
    'sheet.fab.openLabel': "Ouvrir le menu d'action",
    'sheet.fab.closeLabel': 'Fermer le menu',
    'sheet.fab.menuAria': "Menu d'action",
    'sheet.fab.back': 'Retour',
    'sheet.fab.allerA': 'Aller à',
    'sheet.fab.sorts': 'Sorts',
    'sheet.fab.outils': 'Outils',
    'sheet.fab.lancer': 'Lancer',
    'sheet.fab.codex': 'Codex',
    'sheet.fab.repos': 'Repos',
    'sheet.fab.inspiration': 'Inspiration héroïque',
    'sheet.fab.inspirationOn': 'Octroyée — relancez un test au choix.',
    'sheet.fab.inspirationOff': 'Retirée.',
    'sheet.fab.historique': 'Historique des jets',
    'sheet.fab.d20Label': 'd20 vif',
    'sheet.placeholder.todo': 'Section à venir dans un prochain plan.',
    'sheet.ame.personality.title': 'Personnalité',
    'sheet.ame.personality.empty': 'Pas encore renseigné.',
    'sheet.ame.personality.edit': 'Modifier',
    'sheet.ame.personality.save': 'Enregistrer',
    'sheet.ame.personality.cancel': 'Annuler',
    'sheet.ame.personality.editLabel': 'Modifier {field}',
    'sheet.ame.personality.placeholder.trait':
      'Ex. : « Je cite toujours un proverbe à propos. »',
    'sheet.ame.personality.placeholder.ideal':
      'Ex. : « La liberté. Les chaînes sont faites pour être brisées. »',
    'sheet.ame.personality.placeholder.bond':
      'Ex. : « Je donnerais ma vie pour ceux de mon ancien refuge. »',
    'sheet.ame.personality.placeholder.flaw':
      'Ex. : « Je ne résiste jamais à un trésor mal gardé. »',
    'sheet.ame.backstory.title': 'Histoire',
    'sheet.ame.backstory.empty': 'Aucune histoire écrite pour l’instant.',
    'sheet.ame.backstory.placeholder':
      'Raconte le passé de ton personnage : ses origines, ce qui l’a poussé à l’aventure…',
    'sheet.ame.stats.title': 'Statistiques',
    'sheet.ame.stats.totalRolls': 'Jets lancés',
    'sheet.ame.stats.avgD20': 'Moyenne au d20',
    'sheet.ame.stats.crits': 'Coups critiques',
    'sheet.ame.stats.fumbles': 'Échecs critiques',
    'sheet.ame.stats.topSkill': 'Compétence fétiche',
    'sheet.ame.stats.noRolls': 'Aucun jet enregistré pour l’instant.',
    'sheet.magie.ancestry.tieflingTitle': "Sorts d'héritage fiélon",
    'sheet.magie.ancestry.elfTitle': 'Sorts de lignage elfique',
    'sheet.magie.ancestry.gnomeTitle': 'Sorts de lignage gnome',
    'sheet.magie.ancestry.genericTitle': "Sorts d'ascendance",
    'sheet.magie.ancestry.tieflingCommonSource': "Présence d’outre-monde",
    'sheet.magie.ancestryUsesLabel': 'Usages',
    'sheet.magie.ancestryPerLongRest': 'par repos long',
    'sheet.magie.ancestryNoUsesLeft': 'Plus aucun usage avant un repos long.',
    'sheet.magie.ancestryLockedUntilLevel': 'Disponible au niveau',
    // D13e-followup-grant-display — nom de l'invocation `pact-of-the-tome`
    // (SRD FR : « Pacte du grimoire » — invocations.json > pact-of-the-tome.name.fr).
    'sheet.magie.pactTome.sourceLabel': 'Pacte du grimoire',
    // Préparation des sorts — « sort mineur » = terme officiel SRD FR 5.2.1
    // pour cantrip (cf. règle terminologique du projet).
    'sheet.magie.prep.titleFor': 'Préparation · {class}',
    'sheet.magie.prep.count': '{n} / {cap} préparés',
    'sheet.magie.prep.edit': 'Modifier',
    'sheet.magie.prep.done': 'Terminer',
    'sheet.magie.prep.hint':
      'Choisis tes sorts préparés dans la liste de ta classe. Les sorts mineurs sont toujours disponibles.',
    'sheet.magie.prep.hintWizard':
      'Prépare tes sorts depuis ton grimoire. Les sorts mineurs sont toujours disponibles.',
    'sheet.magie.prep.levelLabel': 'Niveau {n}',
    'sheet.magie.prep.prepared': 'Préparé',
    'sheet.magie.prep.alwaysAvailable': 'Toujours',
    'sheet.magie.prep.emptyPrepared': 'Aucun sort préparé pour le moment.',
    // Formulation NEUTRE en genre : l'ancienne chaîne était codée en dur et
    // accordée au féminin (« Cette aventurière ») — elle mégenrait tout
    // personnage masculin ou non binaire.
    'sheet.magie.noMagic':
      'Ce personnage ne pratique aucun art arcanique — aucune classe lanceuse de sorts.',
    // Mode Magie — cartes, cercle/pacte, liste, modale de sort
    'sheet.magie.restore': 'Restaurer',
    'sheet.magie.noSlotToConsume': 'Plus aucun emplacement à consommer',
    'sheet.magie.longPressRestore': 'Appui long pour restaurer',
    'sheet.magie.cantripLabel': 'Sort mineur',
    'sheet.magie.cantripsHeading': 'Sorts mineurs',
    'sheet.magie.slotLevelShort': 'Niv. {n}',
    'sheet.magie.concentrationShort': 'Concentr.',
    'sheet.magie.ritualShort': 'Rituel',
    'sheet.magie.searchPlaceholder': 'Rechercher un sort…',
    'sheet.magie.searchLabel': 'Rechercher un sort',
    'sheet.magie.spellbookTitle': 'Grimoire',
    'sheet.magie.filterAll': 'Tous',
    'sheet.magie.filterPrepared': 'Préparés',
    'sheet.magie.filterCantrips': 'Sorts mineurs',
    'sheet.magie.filterRituals': 'Rituels',
    'sheet.magie.noSpellMatch': 'Aucun sort ne correspond à ces filtres.',
    'sheet.magie.preparedHeading': 'Sorts préparés · {n}',
    'sheet.magie.grimoireHeading': 'Grimoire · {n}',
    'sheet.magie.grimoireAllPrepared': 'Tous vos sorts inscrits sont préparés aujourd’hui.',
    'sheet.magie.pact.title': 'Magie de pacte',
    'sheet.magie.pact.consumed': 'Emplacement de pacte consommé',
    'sheet.magie.pact.restored': 'Emplacement de pacte restauré',
    'sheet.magie.pact.shortRestTitle': 'Repos court simulé',
    'sheet.magie.pact.shortRestSub': 'Emplacements de pacte restaurés',
    'sheet.magie.pact.slotsInfo': 'Emplacements de niveau {n} · récupérés au repos court.',
    'sheet.magie.pact.dotConsume':
      'Consommer un emplacement de pacte de niveau {n} (appui long pour restaurer)',
    'sheet.magie.pact.dotRestore':
      'Restaurer un emplacement de pacte de niveau {n} (appui long)',
    'sheet.magie.circle.title': 'Cercle d’invocation',
    'sheet.magie.circle.noneUnlocked': 'Aucun emplacement de sort débloqué pour le moment.',
    'sheet.magie.circle.slotConsumed': 'Emplacement niv. {n} consommé',
    'sheet.magie.circle.slotRestored': 'Emplacement niv. {n} restauré',
    'sheet.magie.circle.longRestTitle': 'Repos long simulé',
    'sheet.magie.circle.longRestSub': 'Tous les emplacements restaurés',
    'sheet.magie.circle.centerLabel': 'Cercle',
    'sheet.magie.circle.rings': 'anneaux',
    'sheet.magie.circle.dotConsume':
      'Consommer un emplacement de niveau {n} (appui long pour restaurer)',
    'sheet.magie.circle.dotRestore':
      'Restaurer un emplacement de niveau {n} (appui long)',
    'sheet.magie.detail.noCasterTitle': 'Aucune classe lanceuse',
    'sheet.magie.detail.noCasterSub': 'Le sort ne peut être lancé.',
    'sheet.magie.detail.noSlotTitle': 'Plus d’emplacement',
    'sheet.magie.detail.noSlotSub': 'Aucun emplacement de niv. {n} disponible.',
    'sheet.magie.detail.concBrokenTitle': 'Concentration brisée',
    'sheet.magie.detail.concBrokenSub': 'Le sort précédent prend fin.',
    'sheet.magie.detail.castLevelSuffix': ' · niv. {n}',
    'sheet.magie.detail.castBigCantrip': 'Sort mineur',
    'sheet.magie.detail.castDcHint': 'DD {dc} si jet de sauvegarde requis',
    'sheet.magie.detail.castDone': 'Lancé',
    'sheet.magie.detail.concSuffix': ' · Concentration',
    'sheet.magie.detail.ritualSuffix': ' · Rituel',
    'sheet.magie.detail.atHigherLevels': 'À niveau supérieur',
    'sheet.magie.detail.castingClass': 'Classe lanceuse',
    'sheet.magie.detail.classOption': '{name} (niv. {n})',
    'sheet.magie.detail.slotSection': 'Emplacement',
    'sheet.magie.detail.noSlotAvailable':
      'Aucun emplacement de niveau {n} ou supérieur disponible.',
    'sheet.magie.detail.close': 'Fermer',
    'sheet.magie.detail.attackShort': 'Jet d’att.',
    'sheet.magie.detail.attackLabel': 'Attaque · {spell}',
    'sheet.magie.detail.cast': 'Lancer',
    'sheet.magie.detail.damageTitle': 'Dégâts',
    'sheet.magie.detail.damageBasePreview':
      'Base au niveau {level} : {formula} ({perLevel} par niveau supérieur)',
    'sheet.magie.detail.damageCantripPreview':
      'Progression sort mineur : {base} → {t5} (niv. 5) → {t11} (niv. 11) → {t17} (niv. 17)',
    'sheet.magie.stats.classLevelShort': 'Niv. {n}',
    'sheet.magie.stats.abilityLabel': 'Caract.',
    'sheet.magie.stats.dcLabel': 'DD',
    'sheet.magie.stats.attackLabel': '+ attaque',
    'sheet.magie.stats.preparedLabel': 'Préparation :',
    'sheet.magie.stats.preparedValue': '{n} sorts',
    // Plan D14 — carte profil de créature invoquée. Libellés du stat block
    // repris du SRD FR : « Classe d'armure », « Points de vie », « Facteur de
    // puissance » (= Challenge), « Actions bonus », « Réactions ».
    'sheet.magie.summon.cardLabel': 'Profil de {name}',
    'sheet.magie.summon.heading': 'Profil de la créature invoquée',
    'sheet.magie.summon.ac': "Classe d'armure",
    'sheet.magie.summon.hp': 'Points de vie',
    'sheet.magie.summon.speed': 'Vitesse',
    'sheet.magie.summon.senses': 'Sens',
    'sheet.magie.summon.languages': 'Langues',
    'sheet.magie.summon.challenge': 'Facteur de puissance',
    'sheet.magie.summon.resistances': 'Résistances',
    'sheet.magie.summon.immunities': 'Immunités',
    'sheet.magie.summon.traits': 'Traits',
    'sheet.magie.summon.actions': 'Actions',
    'sheet.magie.summon.bonusActions': 'Actions bonus',
    'sheet.magie.summon.reactions': 'Réactions',
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
    // Abréviations d'aptitude (chips de sauvegarde)
    'ability.short.for': 'For',
    'ability.short.dex': 'Dex',
    'ability.short.con': 'Con',
    'ability.short.int': 'Int',
    'ability.short.sag': 'Sag',
    'ability.short.cha': 'Cha',
    // Mode Essence — ordres, en-tête, sauvegardes, compétences, hexagramme
    'sheet.essence.advantage': 'Avantage',
    'sheet.essence.normal': 'Normal',
    'sheet.essence.disadvantage': 'Désavantage',
    'sheet.essence.close': 'Fermer',
    'sheet.essence.divineOrder.title': 'Ordre divin',
    'sheet.essence.divineOrder.aria': 'Ordre divin : {name}',
    'sheet.essence.primalOrder.title': 'Ordre primordial',
    'sheet.essence.primalOrder.aria': 'Ordre primordial : {name}',
    'sheet.essence.header.aura': 'Aura',
    'sheet.essence.header.inspirationChip': 'Inspiration',
    'sheet.essence.header.inspirationGranted': 'Inspiration accordée',
    'sheet.essence.header.inspirationRemoved': 'Inspiration retirée',
    'sheet.essence.header.inspirationGrantedSub': 'Prochain d20 avec avantage',
    'sheet.essence.header.grantInspirationAria': 'Accorder l’inspiration',
    'sheet.essence.header.removeInspirationAria': 'Retirer l’inspiration',
    'sheet.essence.header.exhaustion': 'Épuisement · niveau {n}',
    'sheet.essence.header.exhaustionPenalty': '−{n} sur tous les jets de d20.',
    'sheet.essence.invocations.title': 'Manifestations occultes',
    'sheet.essence.invocations.kind': 'Manifestation occulte',
    'sheet.essence.invocations.aria': 'Manifestation occulte : {name}',
    'sheet.essence.saves.title': 'Sauvegardes',
    'sheet.essence.saves.rollLabel': 'JS {ability}',
    'sheet.essence.saves.menuTitle': 'JS {ability}',
    'sheet.essence.saves.chipAria': 'Jet de sauvegarde {ability}',
    'sheet.essence.saves.proficientSuffix': ' (maîtrise)',
    'sheet.essence.saves.menuAria': 'Options pour le jet de sauvegarde {ability}',
    'sheet.essence.skills.title': 'Compétences',
    'sheet.essence.skills.searchPlaceholder': 'Que veux-tu faire ?',
    'sheet.essence.skills.noMatch': 'Aucune compétence correspondante.',
    'sheet.essence.skills.notProficient': 'Non maîtrisée',
    'sheet.essence.skills.proficient': 'Maîtrise',
    'sheet.essence.skills.expertise': 'Expertise',
    'sheet.essence.hex.title': 'Hexagramme',
    'sheet.essence.hex.proficiency': 'Maîtrise',
    'sheet.essence.hex.rollLabel': 'Test de {ability}',
    'sheet.essence.hex.pointAria': 'Test de {ability} (appui long pour avantage/désavantage)',
    'sheet.essence.hex.closeMenu': 'Fermer le menu',
    'sheet.essence.hex.short.int': 'Intel.',
    'sheet.essence.hex.short.sag': 'Sagesse',
    'sheet.essence.hex.short.cha': 'Charisme',
    'sheet.essence.hex.short.for': 'Force',
    'sheet.essence.hex.short.con': 'Const.',
    'sheet.essence.hex.short.dex': 'Dextér.',
    // Combat — badge Weapon Mastery (hotfix UAT 2026-05-19)
    'sheet.combat.attacks.masteryBadgePrefix': 'Maîtrise',
    'sheet.combat.attacks.masteryBadgeAria': 'Voir la maîtrise de {weapon}',
    // Nav shell
    'nav.aria': 'Navigation principale',
    'nav.brand.aria': "Retour à l'accueil",
    'nav.back': 'Retour',
    'nav.back.aria': 'Retour à la bibliothèque',
    // Destinations du bouton Retour contextuel (cf. `lib/parent-route.ts`) :
    // l'annonce doit nommer la destination RÉELLE, pas la bibliothèque.
    'nav.back.campaigns': 'Retour à mes campagnes',
    'nav.back.account': 'Retour au compte',
    'nav.back.content': 'Retour à mon contenu',
    'nav.back.maps': 'Retour aux cartes',
    'nav.avatar.aria': 'Compte (à venir)',
    // Barre de navigation basse (mobile) / rail de destinations (desktop).
    // Terminologie reprise telle quelle du SRD FR 5.2.1 : « action Bonus »,
    // « Réaction », « attaque d'Opportunité » (majuscules du terme de jeu).
    'sheet.turnOptions.title': 'En dehors de ton action',
    'sheet.turnOptions.hint':
      'Ce qui ne coûte pas ton action, et qu’on oublie une campagne entière.',
    'sheet.turnOptions.bonus': 'Action Bonus',
    'sheet.turnOptions.bonus.empty': 'Aucun sort d’action Bonus connu.',
    'sheet.turnOptions.reaction': 'Réaction',
    'sheet.turnOptions.opportunityAttack': 'Attaque d’Opportunité',
    'library.loading': 'Chargement de tes personnages',
    'sheet.switcher.open': 'Changer de personnage',
    'sheet.switcher.title': 'Changer de personnage',
    'sheet.switcher.hint': 'Ouvre une autre de tes fiches sans repasser par la bibliothèque.',
    'sheet.switcher.level': 'Niveau',
    'account.dice3d.title': 'Dés en relief',
    'account.dice3d.hint':
      'Les dés numériques tombent en trois dimensions et se posent sur leur face. Décoratif : le résultat est le même sans.',
    'account.notifications.title': 'Notifications de partie',
    'account.notifications.hint':
      'Document du meneur, début de combat, ton tour. Coupe les annonces sans masquer le bandeau « à toi de jouer » de la fiche. Réglage propre à cet appareil.',
    'account.haptics.title': 'Retour haptique',
    'account.haptics.hint':
      "Vibration courte sur les jets et leurs issues. Réglage propre à cet appareil.",
    // Palette de commandes (⌘K)
    'palette.open': 'Rechercher partout',
    'palette.title': 'Rechercher',
    'palette.placeholder': 'Un personnage, une campagne, une règle…',
    'palette.hint': 'Cherche un personnage, une campagne, un écran, ou n’importe quelle entrée du Codex.',
    'palette.close': 'Fermer la recherche',
    'palette.empty': 'Rien ne correspond à ta recherche.',
    'palette.loading': 'Le Codex se charge…',
    'palette.group.characters': 'Personnages',
    'palette.group.campaigns': 'Campagnes',
    'palette.group.destinations': 'Aller à',
    'palette.group.codex': 'Le Codex',
    'palette.nav.home': 'Mes personnages',
    'palette.nav.campaigns': 'Mes campagnes',
    'palette.nav.codex': 'Le Codex',
    'palette.nav.account': 'Mon compte',
    'palette.nav.create': 'Créer un personnage',
    'palette.nav.join': 'Rejoindre une campagne',
    'palette.nav.packs': 'Mes packs de contenu',
    'palette.keys.move': 'naviguer',
    'palette.keys.select': 'ouvrir',
    'palette.keys.close': 'fermer',
    'palette.character.level': 'niv.',
    'palette.campaign.gm': 'Tu es MJ',
    'palette.campaign.player': 'Tu y joues',
    'nav.tabs.aria': 'Espaces principaux',
    'nav.tab.characters': 'Personnages',
    'nav.tab.campaigns': 'Campagnes',
    'nav.tab.codex': 'Codex',
    // Library
    'library.title': 'Bibliothèque',
    'library.subtitle': 'Tes héros et héroïnes',
    'library.cta.create': 'Créer un personnage',
    'library.cta.join': 'Rejoindre une campagne',
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
    'library.card.campaign': 'Campagne',
    // DM dashboard — vue MJ (S1 MVP route /dm)
    'dm.title': 'Tableau du meneur',
    'dm.subtitle': "Vue d'ensemble de la compagnie",
    'dm.empty.title': 'Aucun héros à animer',
    'dm.empty.body':
      "Crée ou invite des personnages pour mener leur épopée. Le tableau s'illumine dès qu'un compagnon rejoint l'aventure.",
    'dm.party.title': 'Compagnonnage',
    'dm.party.ariaList': 'Liste des compagnons',
    'dm.party.openSheet': 'Ouvrir la fiche de',
    'dm.party.hpLabel': 'PV',
    'dm.party.acLabel': 'CA',
    'dm.party.initLabel': 'Init.',
    'dm.party.conditionsAria': 'États actifs',
    'dm.notes.title': 'Notes de séance',
    'dm.notes.placeholder':
      "Esquisse intrigues, secrets, fragments à révéler à la table…",
    'dm.notes.localOnly':
      "Conservé localement sur cet appareil. La synchronisation entre tes séances arrive avec le carnet de campagne.",
    'dm.notes.charsAria': 'Caractères saisis',
    'dm.secretRoll.title': 'Jet secret',
    'dm.secretRoll.subtitle': 'd20 + mod, hors regards',
    'dm.secretRoll.modLabel': 'Modificateur',
    'dm.secretRoll.button': 'Lancer en secret',
    'dm.secretRoll.normal': 'Normal',
    'dm.secretRoll.advantage': 'Avantage',
    'dm.secretRoll.disadvantage': 'Désavantage',
    'dm.secretRoll.advantageAria': 'Mode du jet',
    'dm.secretRoll.resultLabel': 'Total',
    'dm.secretRoll.detail': 'Détail',
    'dm.secretRoll.nat20': 'Réussite critique',
    'dm.secretRoll.nat1': 'Échec critique',
    'dm.secretRoll.historyAria': 'Derniers jets secrets',
    'dm.secretRoll.aboutLabel': 'À propos de quoi ?',
    'dm.secretRoll.aboutPlaceholder': 'Perception du garde…',
    'dm.secretRoll.reveal': 'Révéler à la table',
    'dm.secretRoll.revealed': 'Révélé',
    'dm.tip.revealSecretRoll': 'Rejournalise ce jet en visible par toute la table.',
    // Campaigns — liste « Mes campagnes » + create/leave (JALON 4.0.4)
    'campaigns.title': 'Mes campagnes',
    'campaigns.subtitle': 'Les tables où ton héros prend vie',
    'campaigns.list.aria': 'Liste des campagnes',
    'campaigns.empty.title': 'Aucune campagne pour l’instant',
    'campaigns.empty.body':
      "Crée ta première campagne pour réunir une compagnie, ou rejoins-en une par code d'invitation.",
    'campaigns.error.title': 'Lecture impossible',
    'campaigns.error.body':
      'Impossible de récupérer tes campagnes. Vérifie ta connexion et réessaye.',
    'campaigns.error.retry': 'Réessayer',
    'campaigns.cta.create': 'Créer une campagne',
    'campaigns.cta.join': 'Rejoindre par code',
    'campaigns.card.openSoon': 'Ouverture bientôt',
    'campaigns.card.open': 'Ouvrir',
    'campaigns.card.leave': 'Quitter',
    'campaigns.card.roleGm': 'Meneur',
    'campaigns.card.roleMember': 'Joueur',
    'campaigns.card.membersLabel': 'Meneurs',
    'campaigns.card.inviteCodeLabel': 'Code',
    'campaigns.card.dateLabel': 'Mise à jour',
    'campaigns.create.title': 'Nouvelle campagne',
    'campaigns.create.intro':
      "Donne-lui un nom évocateur — c'est sous cette bannière que la compagnie se réunira.",
    'campaigns.create.name.label': 'Nom de la campagne',
    'campaigns.create.name.helper': '80 caractères au plus',
    'campaigns.create.name.placeholder': "L'Ombre de Caer Dûn",
    'campaigns.create.description.label': 'Description',
    'campaigns.create.description.helper':
      'Optionnelle — un pitch court pour situer la table.',
    'campaigns.create.description.placeholder':
      "Une campagne urbaine dans la cité brumeuse de Caer Dûn…",
    'campaigns.create.cancel': 'Annuler',
    'campaigns.create.submit': 'Créer',
    'campaigns.create.submitting': 'Création en cours…',
    'campaigns.create.close': 'Fermer la création de campagne',
    'campaigns.create.error.nameRequired': 'Le nom est obligatoire.',
    'campaigns.create.error.nameTooLong':
      'Le nom doit faire 80 caractères au plus.',
    'campaigns.create.error.notSignedIn':
      'Tu dois être connecté pour créer une campagne.',
    'campaigns.create.error.inviteCollision':
      "Impossible de générer un code d'invitation unique. Réessaye dans un instant.",
    'campaigns.create.error.generic':
      "La création n'a pas abouti. Vérifie ta connexion et réessaye.",
    'campaigns.leave.title': 'Quitter la campagne',
    'campaigns.leave.confirmPrefix': 'Quitter',
    'campaigns.leave.confirmSuffix': '?',
    'campaigns.leave.dataNotice':
      'Ton personnage lié reste sain et sauf dans ta bibliothèque.',
    'campaigns.leave.cancel': 'Rester',
    'campaigns.leave.confirm': 'Quitter',
    'campaigns.leave.submitting': 'Sortie en cours…',
    'campaigns.leave.close': 'Fermer la confirmation',
    'campaigns.leave.error.lastGm':
      "Tu es le dernier meneur de cette campagne. Promeus un autre joueur en co-meneur avant de la quitter.",
    'campaigns.leave.error.notFound':
      "Cette campagne n'existe plus côté serveur.",
    'campaigns.leave.error.generic':
      "La sortie n'a pas abouti. Vérifie ta connexion et réessaye.",
    // Campaign detail + join + promote (JALON 4.0.5)
    'campaigns.detail.back': 'Mes campagnes',
    'campaigns.detail.leaveCta': 'Quitter la campagne',
    'campaigns.detail.invite.aria': "Code d'invitation",
    'campaigns.detail.invite.title': 'Inviter à la table',
    'campaigns.detail.invite.codeLabel': "Code d'invitation",
    'campaigns.detail.invite.codeAria': "Code d'invitation à dicter ou copier",
    'campaigns.detail.invite.copy': 'Copier le code',
    'campaigns.detail.invite.copied': 'Copié !',
    'campaigns.detail.invite.shareLink': 'Partager le lien',
    'campaigns.detail.invite.linkCopied': 'Lien copié !',
    'campaigns.detail.invite.shareTitle': 'Rejoins ma campagne GrimWar',
    'campaigns.detail.invite.help':
      'Toute personne possédant ce code peut rejoindre cette campagne. Partage-le uniquement avec les joueurs invités.',
    'campaigns.detail.invite.firstStepTitle': 'Invite tes joueurs',
    'campaigns.detail.invite.firstStepBody':
      'Ta campagne est prête. Partage le lien ou dicte le code autour de la table : chaque joueur rejoint, puis crée ou lie son personnage. Tu les verras apparaître ici dans la compagnie.',
    'campaigns.detail.invite.rotate': 'Régénérer le code',
    'campaigns.detail.invite.rotateConfirm': 'Confirmer la régénération',
    'campaigns.detail.invite.rotateCancel': 'Garder le code actuel',
    'campaigns.detail.invite.rotating': 'Régénération en cours…',
    'campaigns.detail.invite.rotateWarning':
      'Le code actuel cessera immédiatement de fonctionner, ainsi que les liens déjà partagés. Les membres déjà inscrits ne sont pas affectés.',
    'campaigns.detail.invite.rotateError':
      "La régénération n'a pas abouti. Vérifie ta connexion et réessaye.",
    'campaigns.detail.invite.rotated': 'Nouveau code en place.',
    'campaigns.detail.roster.aria': 'Membres de la campagne',
    'campaigns.detail.roster.title': 'La compagnie',
    'campaigns.detail.dmTools.title': 'Outils du meneur',
    'campaigns.detail.dmTools.aria': 'Outils du meneur — jet secret et bloc-notes',
    'campaigns.dmTools.open': 'Outils',
    'campaigns.dmTools.openTip': 'Jet secret et bloc-notes, sans quitter la table.',
    'campaigns.detail.roster.youSuffix': '(toi)',
    'campaigns.detail.roster.promote': 'Promouvoir meneur',
    'campaigns.detail.roster.demote': 'Rétrograder',
    'campaigns.detail.roster.kick': 'Exclure',
    'campaigns.detail.roster.viewSheet': 'Voir la fiche',
    'campaigns.memberAction.close': 'Fermer la confirmation',
    'campaigns.memberAction.cancel': 'Annuler',
    'campaigns.memberAction.demote.title': 'Rétrograder ce meneur',
    'campaigns.memberAction.demote.confirmPrefix':
      'Retirer les droits de meneur à',
    'campaigns.memberAction.demote.confirmSuffix': '?',
    'campaigns.memberAction.demote.notice':
      'Il redevient joueur et garde sa place à la table : il perd seulement l’autorité sur la campagne. La rétrogradation est réversible — tu peux le repromouvoir à tout moment.',
    'campaigns.memberAction.demote.confirm': 'Rétrograder',
    'campaigns.memberAction.demote.submitting': 'Rétrogradation en cours…',
    'campaigns.memberAction.kick.title': 'Exclure ce membre',
    'campaigns.memberAction.kick.confirmPrefix': 'Retirer de la campagne',
    'campaigns.memberAction.kick.confirmSuffix': '?',
    'campaigns.memberAction.kick.notice':
      'Il perd l’accès à la campagne, à ses séances et à son journal. Sa fiche de personnage lui appartient et reste intacte dans sa bibliothèque. Il peut revenir avec le code d’invitation.',
    'campaigns.memberAction.kick.confirm': 'Confirmer l’exclusion',
    'campaigns.memberAction.kick.submitting': 'Exclusion en cours…',
    'campaigns.memberAction.error.notFound':
      "Cette campagne n'existe plus côté serveur.",
    'campaigns.memberAction.error.lastGm':
      'Impossible : une campagne doit toujours garder au moins un meneur. Promeus un autre membre d’abord.',
    'campaigns.memberAction.error.generic':
      "L'opération n'a pas abouti. Vérifie ta connexion et réessaye.",
    'campaigns.detail.party.aria': 'État de combat de la compagnie en temps réel',
    'campaigns.detail.party.title': 'État de la compagnie',
    'campaigns.detail.party.empty': 'Aucun joueur n’a encore lié de personnage.',
    'campaigns.detail.party.cardLoading': 'Chargement…',
    'campaigns.detail.party.cardError': 'Fiche indisponible',
    'campaigns.detail.party.cardUnavailable': 'Personnage introuvable',
    'campaigns.detail.partyAggregate.aria': 'Résumé de la compagnie pour le meneur',
    'campaigns.detail.partyAggregate.size': 'Effectif',
    'campaigns.detail.partyAggregate.avgLevel': 'Niveau moyen',
    'campaigns.detail.partyAggregate.levelRange': 'Niveaux',
    'campaigns.detail.partyAggregate.downed': 'À terre',
    'campaigns.detail.myCharacter.aria': 'Mon personnage dans cette campagne',
    'campaigns.detail.myCharacter.title': 'Mon personnage',
    'campaigns.detail.myCharacter.none': 'Aucun personnage lié pour le moment.',
    'campaigns.detail.myCharacter.loading': 'Chargement du personnage…',
    'campaigns.detail.myCharacter.unknown':
      'Personnage lié introuvable (supprimé ou non chargé).',
    'campaigns.detail.myCharacter.levelPrefix': 'Niveau',
    'campaigns.detail.myCharacter.link': 'Lier un personnage',
    'campaigns.detail.myCharacter.change': 'Changer',
    'campaigns.detail.myCharacter.open': 'Ouvrir ma fiche',
    'campaigns.detail.myCharacter.create': 'Créer un personnage',
    'campaigns.detail.myCharacter.linkExisting': 'Lier un existant',
    'campaigns.detail.myCharacter.firstStepTitle': 'Rejoins l’aventure',
    'campaigns.detail.myCharacter.firstStepBody':
      'Bienvenue à la table. Crée ton personnage ou lie-en un existant pour prendre ta place dans la campagne.',
    'campaigns.detail.error.title': 'Lecture impossible',
    'campaigns.detail.error.body':
      'Impossible de charger cette campagne. Vérifie ta connexion et réessaye.',
    'campaigns.detail.error.retry': 'Réessayer',
    'campaigns.detail.error.notFoundTitle': 'Campagne introuvable',
    'campaigns.detail.error.notFoundBody':
      "Cette campagne n'existe plus ou tu n'y as pas accès.",
    // Lecture MJ d'une fiche de joueur — JALON 4A.3
    'campaigns.memberSheet.back': 'Retour à la campagne',
    'campaigns.memberSheet.viewingPrefix': 'Fiche de',
    'campaigns.memberSheet.forbidden.title': 'Accès réservé au meneur',
    'campaigns.memberSheet.forbidden.body':
      'Seul un meneur de cette campagne peut consulter la fiche d’un joueur.',
    'campaigns.memberSheet.memberNotFound.title': 'Membre introuvable',
    'campaigns.memberSheet.memberNotFound.body':
      'Ce joueur ne fait pas (ou plus) partie de cette campagne.',
    'campaigns.memberSheet.noCharacter.title': 'Aucune fiche liée',
    'campaigns.memberSheet.noCharacter.body':
      'Ce joueur n’a pas encore lié de personnage à la campagne.',
    'campaigns.memberSheet.error.title': 'Fiche inaccessible',
    'campaigns.memberSheet.error.body':
      'Impossible de charger cette fiche. Le joueur l’a peut-être déliée, ou tu n’es plus meneur de sa campagne.',
    'campaigns.detail.eventFeed.aria': 'Journal de bord de la campagne',
    'campaigns.detail.eventFeed.title': 'Activité récente',
    'campaigns.detail.eventFeed.empty': 'Aucune activité enregistrée pour l’instant.',
    'campaigns.detail.eventFeed.loading': 'Chargement de l’activité…',
    'campaigns.detail.eventFeed.error':
      'Impossible de charger l’activité de la campagne.',
    'campaigns.detail.eventFeed.dmOnlyHint': 'Visible par le meneur uniquement.',
    'campaigns.detail.eventFeed.levelPrefix': 'Niveau ',
    'campaigns.detail.eventFeed.kind.roll': 'Jet de dés',
    'campaigns.detail.eventFeed.kind.hpChange': 'Points de vie',
    'campaigns.detail.eventFeed.kind.tempHp': 'PV temporaires',
    'campaigns.detail.eventFeed.kind.conditionAdd': 'État ajouté',
    'campaigns.detail.eventFeed.kind.conditionRemove': 'État retiré',
    'campaigns.detail.eventFeed.kind.spellCast': 'Sort lancé',
    'campaigns.detail.eventFeed.kind.slotConsumed': 'Emplacement consommé',
    'campaigns.detail.eventFeed.kind.slotRestored': 'Emplacement récupéré',
    'campaigns.detail.eventFeed.kind.itemAcquired': 'Objet obtenu',
    'campaigns.detail.eventFeed.kind.itemRemoved': 'Objet retiré',
    'campaigns.detail.eventFeed.kind.secretRoll': 'Jet secret du meneur',
    'campaigns.detail.eventFeed.kind.sessionStart': 'Séance démarrée',
    'campaigns.detail.eventFeed.kind.sessionEnd': 'Séance terminée',
    'campaigns.detail.eventFeed.kind.generic': 'Événement de jeu',
    'campaigns.detail.eventFeed.kind.dmEdit': 'Édition MJ',
    'campaigns.detail.eventFeed.dmEdit.summary': '{count} champ·s modifié·s',
    'campaigns.detail.eventFeed.dmEdit.fieldsRow': 'Champs modifiés',
    'campaigns.detail.eventFeed.dmEditField.generic': 'Autre champ',
    'campaigns.detail.eventFeed.dmEditField.hp': 'Points de vie',
    'campaigns.detail.eventFeed.dmEditField.conditions': 'États',
    'campaigns.detail.eventFeed.dmEditField.exhaustion': 'Épuisement',
    'campaigns.detail.eventFeed.dmEditField.inspiration': 'Inspiration',
    'campaigns.detail.eventFeed.dmEditField.deathSaves': 'Jets contre la mort',
    'campaigns.detail.eventFeed.dmEditField.abilities': 'Caractéristiques',
    'campaigns.detail.eventFeed.dmEditField.saveProficiencies': 'Jets de sauvegarde',
    'campaigns.detail.eventFeed.dmEditField.skills': 'Compétences',
    'campaigns.detail.eventFeed.dmEditField.ac': 'Classe d’armure',
    'campaigns.detail.eventFeed.dmEditField.speed': 'Vitesse',
    'campaigns.detail.eventFeed.dmEditField.initiative': 'Initiative',
    'campaigns.detail.eventFeed.dmEditField.hitDice': 'Dés de vie',
    'campaigns.detail.eventFeed.dmEditField.spellSlots': 'Emplacements de sort',
    'campaigns.detail.eventFeed.dmEditField.classResources': 'Ressources de classe',
    'campaigns.detail.eventFeed.dmEditField.preparedSpells': 'Sorts préparés',
    'campaigns.detail.eventFeed.dmEditField.knownSpells': 'Sorts connus',
    'campaigns.detail.eventFeed.dmEditField.inventory': 'Inventaire',
    'campaigns.detail.eventFeed.dmEditField.featureUsage': 'Aptitudes',
    'campaigns.detail.eventFeed.dmEditField.extraProficiencies': 'Maîtrises',
    'campaigns.detail.eventFeed.dmEditField.experience': 'Expérience',
    'campaigns.detail.eventFeed.dmEditField.alignment': 'Alignement',
    'campaigns.detail.eventFeed.dmEditField.totalLevel': 'Niveau',
    'campaigns.detail.eventFeed.dmEditField.status': 'Statut',
    'campaigns.detail.eventFeed.dmEditField.stats': 'Statistiques',
    'campaigns.memberSheet.dmEditBadge': 'Édition MJ',
    'sheet.dmEdit.bannerTitle': 'Édition meneur',
    'sheet.dmEdit.bannerHint':
      'Tu modifies la fiche d’un joueur. Le nom et la personnalité restent réservés au joueur.',
    'sheet.dmEdit.fieldLocked': 'Réservé au joueur',
    'journal.tpl.dmEdit': 'Le meneur ajuste la fiche de **{target}** ({count} champ·s).',
    'sessions.events.title': 'Événements de la séance',
    'sessions.events.empty': 'Aucun événement enregistré pour cette séance.',
    'sessions.events.loading': 'Chargement des événements…',
    'sessions.events.error': 'Impossible de charger les événements.',
    'sessions.events.filter.aria': 'Filtrer les événements par type',
    'sessions.events.filter.all': 'Tous',
    'sessions.events.filter.dmEdits': 'Éditions MJ',
    'campaigns.detail.eventFeed.openDetail': 'Voir le détail de l’événement',
    'campaigns.detail.eventFeed.filter.aria': 'Filtrer l’activité par joueur',
    'campaigns.detail.eventFeed.filter.all': 'Tous',
    'campaigns.detail.eventFeed.filter.emptyForPlayer':
      'Aucune activité pour ce joueur pour l’instant.',
    'campaigns.detail.eventFeed.detail.close': 'Fermer le détail',
    'campaigns.detail.eventFeed.detail.actor': 'Acteur',
    'campaigns.detail.eventFeed.detail.target': 'Cible',
    'campaigns.detail.eventFeed.detail.dmActor': 'Meneur',
    'campaigns.detail.eventFeed.detail.systemActor': 'Système',
    'campaigns.detail.eventFeed.detail.unknownCharacter': 'Personnage',
    'campaigns.detail.eventFeed.detail.noDetail': 'Aucun détail supplémentaire.',
    'campaigns.detail.eventFeed.detail.delete': 'Retirer du journal',
    'campaigns.detail.eventFeed.detail.deleteConfirm': 'Confirmer le retrait',
    'campaigns.detail.eventFeed.detail.deleteError': 'Le retrait a échoué.',
    'campaigns.detail.eventFeed.field.label': 'Intitulé',
    'campaigns.detail.eventFeed.field.total': 'Total',
    'campaigns.detail.eventFeed.field.modifier': 'Modificateur',
    'campaigns.detail.eventFeed.field.dice': 'Dés',
    'campaigns.detail.eventFeed.field.before': 'Avant',
    'campaigns.detail.eventFeed.field.after': 'Après',
    'campaigns.detail.eventFeed.field.delta': 'Variation',
    'campaigns.detail.eventFeed.field.reason': 'Cause',
    'campaigns.detail.eventFeed.field.level': 'Niveau',
    'campaigns.detail.eventFeed.field.slot': 'Emplacement',
    'campaigns.detail.eventFeed.field.count': 'Nombre',
    'campaigns.detail.eventFeed.field.quantity': 'Quantité',
    'campaigns.detail.eventFeed.field.components': 'Composantes',
    'campaigns.detail.eventFeed.field.crit': 'Réussite critique',
    'campaigns.detail.eventFeed.field.fumble': 'Échec critique',
    'campaigns.detail.eventFeed.reason.damage': 'Dégâts',
    'campaigns.detail.eventFeed.reason.heal': 'Soin',
    'campaigns.detail.eventFeed.value.yes': 'Oui',
    'campaigns.detail.eventFeed.value.no': 'Non',
    'campaigns.join.title': 'Rejoindre une campagne',
    'campaigns.join.intro':
      "Demande son code d'invitation au meneur, puis saisis-le ici.",
    'campaigns.join.code.label': "Code d'invitation",
    'campaigns.join.code.helper': '6 caractères — lettres et chiffres, sans I ni O.',
    'campaigns.join.code.placeholder': 'ABC234',
    'campaigns.join.cancel': 'Annuler',
    'campaigns.join.submit': 'Rejoindre',
    'campaigns.join.submitting': 'Connexion en cours…',
    'campaigns.join.error.lengthInvalid':
      "Le code doit faire exactement 6 caractères.",
    'campaigns.join.error.formatInvalid':
      "Le code utilise des lettres et chiffres (sans 0, 1, I ni O).",
    'campaigns.join.error.codeNotFound':
      "Aucune campagne ne correspond à ce code. Vérifie la saisie auprès du meneur.",
    'campaigns.join.error.campaignNotFound':
      "Cette campagne n'existe plus côté serveur. Demande un nouveau code au meneur.",
    'campaigns.join.error.notSignedIn':
      'Tu dois être connecté pour rejoindre une campagne.',
    'campaigns.join.error.generic':
      "L'invitation n'a pas abouti. Vérifie ta connexion et réessaye.",
    'campaigns.promote.title': 'Promouvoir meneur',
    'campaigns.promote.confirmPrefix': 'Donner les droits de meneur à',
    'campaigns.promote.confirmSuffix': '?',
    'campaigns.promote.notice':
      'Un co-meneur peut modifier la campagne, inviter et inscrire des membres. Le rôle est irréversible côté joueur — seul un meneur peut révoquer un autre meneur.',
    'campaigns.promote.cancel': 'Annuler',
    'campaigns.promote.confirm': 'Promouvoir',
    'campaigns.promote.submitting': 'Promotion en cours…',
    'campaigns.promote.close': 'Fermer la confirmation',
    'campaigns.promote.error.notFound':
      "Cette campagne n'existe plus côté serveur.",
    'campaigns.promote.error.generic':
      "La promotion n'a pas abouti. Vérifie ta connexion et réessaye.",
    'campaigns.linkCharacter.title': 'Lier un personnage',
    'campaigns.linkCharacter.intro':
      'Choisis le personnage que tu incarnes dans cette campagne. Le meneur pourra consulter sa fiche.',
    'campaigns.linkCharacter.loading': 'Chargement de tes personnages…',
    'campaigns.linkCharacter.empty':
      "Tu n'as encore aucun personnage. Crée-en un depuis ta bibliothèque, puis reviens le lier.",
    'campaigns.linkCharacter.listAria': 'Choix du personnage à lier',
    'campaigns.linkCharacter.noneOption': 'Aucun personnage',
    'campaigns.linkCharacter.levelPrefix': 'Niveau',
    'campaigns.linkCharacter.currentSuffix': 'actuel',
    'campaigns.linkCharacter.cancel': 'Annuler',
    'campaigns.linkCharacter.confirm': 'Lier',
    'campaigns.linkCharacter.submitting': 'Liaison en cours…',
    'campaigns.linkCharacter.close': 'Fermer la fenêtre de liaison',
    'campaigns.linkCharacter.error.generic':
      "La liaison n'a pas abouti. Vérifie ta connexion et réessaye.",
    'campaigns.detail.sessionsCta': 'Séances',
    'campaigns.detail.encountersCta': 'Rencontres',
    'campaigns.detail.journalCta': 'Journal',
    'campaigns.detail.handoutsCta': 'Documents',
    'campaigns.detail.mapsCta': 'Cartes',
    'campaigns.detail.mapsPlayerCta': 'Voir la carte',
    'campaigns.detail.settingsCta': 'Réglages',
    'campaigns.detail.spaces.aria': 'Espaces de la campagne',
    'campaigns.detail.spaces.play': 'Jouer',
    'campaigns.detail.spaces.memory': 'Mémoire de la table',
    'campaigns.settings.title': 'Réglages de la campagne',
    'campaigns.settings.intro':
      'Ajuste le nom, le mode de dés de la table et les règles optionnelles. Ces choix s’appliquent à toute la campagne.',
    'campaigns.settings.close': 'Fermer les réglages',
    'campaigns.settings.cancel': 'Annuler',
    'campaigns.settings.save': 'Enregistrer',
    'campaigns.settings.saving': 'Enregistrement…',
    'campaigns.settings.error.generic':
      'Les réglages n’ont pas pu être enregistrés. Réessaie.',
    'campaigns.settings.status.title': 'État de la campagne',
    'campaigns.settings.status.hint':
      'Là où en est ta campagne. Une campagne en pause ou archivée reste consultable, mais signale à la table qu’elle n’est plus active.',
    'campaigns.settings.status.active.label': 'Active',
    'campaigns.settings.status.active.hint': 'La campagne est en cours.',
    'campaigns.settings.status.paused.label': 'En pause',
    'campaigns.settings.status.paused.hint':
      'Une trêve entre deux arcs — vous reprendrez plus tard.',
    'campaigns.settings.status.archived.label': 'Archivée',
    'campaigns.settings.status.archived.hint':
      'La campagne est terminée. Elle reste dans tes souvenirs.',
    'campaigns.status.paused': 'En pause',
    'campaigns.status.archived': 'Archivée',
    'campaigns.detail.statusBanner.paused':
      'Cette campagne est en pause — les séances sont suspendues pour le moment.',
    'campaigns.detail.statusBanner.archived':
      'Cette campagne est archivée — elle reste consultable en lecture.',
    'campaigns.settings.dice.title': 'Mode de dés de la table',
    'campaigns.settings.dice.hint':
      'Le mode par défaut de cette table. Chaque joueur peut le suivre ou choisir le sien dans son compte.',
    'campaigns.settings.variants.title': 'Variantes 5e',
    'campaigns.settings.variants.hint':
      'Règles optionnelles appliquées à toute la table. Désactivées par défaut.',
    'campaigns.settings.variants.featAtLevel1.label': 'Don au niveau 1',
    'campaigns.settings.variants.featAtLevel1.desc':
      'Chaque personnage gagne un don supplémentaire à la création.',
    'campaigns.settings.variants.flanking.label': 'Prise en tenaille',
    'campaigns.settings.variants.flanking.desc':
      'Deux adversaires de part et d’autre d’une créature obtiennent l’avantage au corps à corps.',
    'campaigns.settings.variants.slowHealing.label': 'Guérison naturelle lente',
    'campaigns.settings.variants.slowHealing.desc':
      'Un repos long ne rend plus tous les PV : on récupère en dépensant ses dés de vie.',
    'campaigns.settings.variants.grittyRealism.label': 'Réalisme rugueux',
    'campaigns.settings.variants.grittyRealism.desc':
      'Repos court de 8 heures, repos long de 7 jours.',
    // Handouts MJ→joueur — plan 27
    'handouts.toast.title': 'Le MJ vous a transmis un document',
    'encounters.toast.started.title': 'Le combat commence',
    'encounters.toast.yourTurn.title': 'C’est à vous de jouer',
    'encounters.toast.yourTurn.sub': 'Round {n} · {name}',
    'handouts.screen.back': 'Retour à la campagne',
    'handouts.screen.title': 'Documents',
    'handouts.screen.subtitleDm': 'Cartes, lettres et indices transmis à la table.',
    'handouts.screen.subtitlePlayer': 'Les documents que le MJ vous a transmis.',
    'handouts.screen.newCta': 'Nouveau document',
    'handouts.search.placeholder': 'Chercher un titre, un mot du texte…',
    'handouts.search.aria': 'Chercher parmi les documents',
    'handouts.search.noMatch': 'Aucun document ne correspond à cette recherche.',
    'handouts.screen.empty.dm': 'Aucun document transmis pour le moment.',
    'handouts.screen.empty.player': "Le MJ ne vous a transmis aucun document.",
    'handouts.screen.activeHeading': 'Actifs',
    'handouts.screen.archivedHeading': 'Archivés',
    'handouts.screen.loadError': 'Impossible de charger les documents.',
    'handouts.card.recipientsAll': 'Toute la table',
    'handouts.card.recipientsTargeted': 'Ciblé',
    'handouts.card.open': 'Ouvrir',
    'handouts.card.archive': 'Archiver',
    'handouts.card.archivedBadge': 'Archivé',
    'handouts.card.openedBadge': 'Ouvert',
    'handouts.card.newBadge': 'Nouveau',
    'handouts.detail.close': 'Fermer le document',
    'handouts.create.title': 'Nouveau document',
    'handouts.create.fieldTitle': 'Titre',
    'handouts.create.titlePlaceholder': 'Titre du document',
    'handouts.create.fieldType': 'Type',
    'handouts.create.type.text': 'Texte',
    'handouts.create.type.image': 'Image',
    'handouts.create.type.mixed': 'Les deux',
    'handouts.create.imageDeferred':
      "L'envoi d'image arrivera bientôt — pour l'instant, transmettez un document texte.",
    'handouts.create.fieldContent': 'Contenu',
    'handouts.create.contentPlaceholder':
      'Rédigez le document. Markdown : ## titre, - liste, **gras**, _italique_.',
    'handouts.create.previewLabel': 'Aperçu',
    'handouts.create.previewEmpty': "L'aperçu s'affichera ici.",
    'handouts.create.fieldRecipients': 'Destinataires',
    'handouts.create.recipientsAll': 'Toute la table',
    'handouts.create.recipientsSome': 'Choisir des joueurs',
    'handouts.create.noPlayers': "Aucun joueur n'a encore rejoint la campagne.",
    'handouts.create.cancel': 'Annuler',
    'handouts.create.send': 'Envoyer',
    'handouts.create.sending': 'Envoi…',
    'handouts.create.error.title': 'Donnez un titre au document.',
    'handouts.create.error.content': 'Le document est vide.',
    'handouts.create.error.recipients': 'Choisissez au moins un destinataire.',
    'handouts.create.error.send': "L'envoi a échoué. Vérifiez votre connexion et réessayez.",
    'handouts.create.sentToast': 'Document transmis',
    // Cycle de vie d'un document envoyé (M12)
    'handouts.card.edit': 'Corriger',
    'handouts.card.unarchive': 'Désarchiver',
    'handouts.card.delete': 'Supprimer',
    'handouts.card.deleteConfirm': 'Confirmer la suppression',
    'handouts.card.recipientsNone': 'Aucun destinataire',
    'handouts.edit.title': 'Corriger le document',
    'handouts.edit.save': 'Enregistrer les corrections',
    'handouts.edit.saving': 'Enregistrement…',
    'handouts.edit.savedToast': 'Document corrigé',
    'campaigns.tip.editHandout':
      'Corriger le titre, le texte ou les destinataires. Ajouter un joueur le prévient.',
    'campaigns.tip.unarchiveHandout': 'Remettre ce document dans le flux actif.',
    'campaigns.tip.deleteHandout':
      'Effacer définitivement ce document. L’archivage, lui, en garde la trace.',
    // PNJ récurrents — plan 28
    'campaigns.detail.npcsCta': 'PNJ',
    'campaigns.detail.eventFeed.kind.npcIntroduced': 'PNJ introduit',
    'campaigns.detail.eventFeed.kind.npcAttitudeChanged': 'Attitude d’un PNJ',
    'npcs.role.merchant': 'Marchand',
    'npcs.role.ally': 'Allié',
    'npcs.role.enemy': 'Ennemi',
    'npcs.role.contact': 'Contact',
    'npcs.role.noble': 'Noble',
    'npcs.role.other': 'Autre',
    'npcs.attitude.friendly': 'Amical',
    'npcs.attitude.neutral': 'Neutre',
    'npcs.attitude.hostile': 'Hostile',
    'npcs.attitude.unknown': 'Inconnue',
    'npcs.visibility.all': 'Visible des joueurs',
    'npcs.visibility.dm': 'Secret (MJ seul)',
    'npcs.screen.back': 'Retour à la campagne',
    'npcs.screen.title': 'Personnages non-joueurs',
    'npcs.screen.subtitleDm':
      'Marchands, alliés, contacts et ennemis récurrents de votre campagne.',
    'npcs.screen.subtitlePlayer': 'Les figures que vous avez rencontrées.',
    'npcs.screen.newCta': 'Nouveau PNJ',
    'npcs.screen.empty.dm':
      'Aucun PNJ pour le moment. Créez le premier pour peupler votre monde.',
    'npcs.screen.empty.player': 'Vous n’avez encore rencontré aucun personnage notable.',
    'npcs.screen.noMatch': 'Aucun PNJ ne correspond à ces filtres.',
    'npcs.screen.loadError': 'Impossible de charger les PNJ.',
    'npcs.screen.loading': 'Chargement…',
    'npcs.card.secretBadge': 'Secret',
    'npcs.card.combatBadge': 'Combat',
    'npcs.filters.aria': 'Filtres de l’annuaire des PNJ',
    'npcs.filters.role': 'Rôle',
    'npcs.filters.tag': 'Étiquette',
    'npcs.filters.location': 'Lieu',
    'npcs.filters.all': 'Tous',
    'npcs.detail.back': 'Retour à l’annuaire',
    'npcs.detail.notFound': 'Ce PNJ est introuvable.',
    'npcs.detail.edit': 'Modifier',
    'npcs.detail.delete': 'Supprimer',
    'npcs.detail.duplicate': 'Dupliquer',
    'npcs.duplicate.title': 'Dupliquer vers une autre campagne',
    'npcs.duplicate.intro':
      'Choisis la table qui recevra une copie de ce personnage non-joueur.',
    'npcs.duplicate.helper':
      "La copie arrive en secret, sans ses relations : celles-ci désignent des personnages de cette campagne-ci, qui n'existent pas là-bas.",
    'npcs.duplicate.noTarget':
      "Tu ne mènes aucune autre campagne pour l'instant.",
    'npcs.duplicate.confirm': 'Dupliquer',
    'npcs.duplicate.busy': 'Duplication…',
    'npcs.duplicate.cancel': 'Annuler',
    'npcs.duplicate.error': "La duplication n'a pas abouti. Réessaie.",
    'npcs.duplicate.doneToast': 'Personnage dupliqué',
    'npcs.search.placeholder': 'Chercher un nom, un lieu, une étiquette…',
    'npcs.search.aria': 'Chercher parmi les personnages non-joueurs',
    'npcs.sort.aria': 'Ordre de la liste',
    'npcs.sort.introduction': 'Ordre de rencontre',
    'npcs.sort.alpha': 'Alphabétique',
    'npcs.detail.secretBadge': 'Secret',
    'npcs.detail.publicHeading': 'Description',
    'npcs.detail.relationsHeading': 'Relations',
    'npcs.detail.relations.editCta': 'Modifier les relations',
    'npcs.detail.relations.empty': 'Aucune relation enregistrée.',
    'npcs.detail.combatHeading': 'Statistiques de combat',
    'npcs.detail.combat.cr': 'FP',
    'npcs.detail.combat.ac': 'CA',
    'npcs.detail.combat.hp': 'PV',
    'npcs.detail.combat.monster': 'Monstre lié',
    'npcs.detail.dmNotesHeading': 'Notes du MJ',
    'npcs.detail.dmOnlyHint': 'Visible du MJ seul',
    'npcs.detail.dmNotesEmpty': 'Aucune note secrète.',
    'npcs.detail.deletedToast': 'PNJ supprimé',
    'npcs.detail.deleteError': 'La suppression a échoué.',
    'npcs.detail.deleteConfirm.title': 'Supprimer ce PNJ ?',
    'npcs.detail.deleteConfirm.body': '« {name} » sera définitivement supprimé.',
    'npcs.detail.deleteConfirm.cancel': 'Annuler',
    'npcs.detail.deleteConfirm.confirm': 'Supprimer',
    'npcs.detail.deleteConfirm.deleting': 'Suppression…',
    'npcs.relations.title': 'Relations du PNJ',
    'npcs.relations.close': 'Fermer',
    'npcs.relations.done': 'Terminé',
    'npcs.relations.noCharacters':
      'Aucun personnage de joueur dans cette campagne pour le moment.',
    'npcs.relations.error': 'La mise à jour a échoué.',
    'npcs.edit.createTitle': 'Nouveau PNJ',
    'npcs.edit.editTitle': 'Modifier le PNJ',
    'npcs.edit.field.name': 'Nom',
    'npcs.edit.field.namePlaceholder': 'Nom du personnage',
    'npcs.edit.field.role': 'Rôle',
    'npcs.edit.field.location': 'Lieu',
    'npcs.edit.field.locationPlaceholder': 'Où le rencontre-t-on ?',
    'npcs.edit.field.portrait': 'Portrait',
    'npcs.edit.field.portraitHelper': 'Une lettre ou un emoji.',
    'npcs.edit.field.portraitPlaceholder': 'A',
    'npcs.edit.field.shortDescription': 'Résumé',
    'npcs.edit.field.shortDescriptionPlaceholder': 'Une ou deux phrases.',
    'npcs.edit.field.publicDescription': 'Description publique',
    'npcs.edit.field.publicDescriptionPlaceholder':
      'Ce que les joueurs savent de ce personnage.',
    'npcs.edit.markdownHelper': 'Markdown : ## titre, - liste, **gras**, _italique_.',
    'npcs.edit.field.dmNotes': 'Notes du MJ',
    'npcs.edit.field.dmNotesHelper': 'Secret — jamais montré aux joueurs.',
    'npcs.edit.field.dmNotesPlaceholder': 'Secrets, intentions, ressorts cachés…',
    'npcs.edit.field.tags': 'Étiquettes',
    'npcs.edit.field.tagsHelper': 'Séparées par des virgules.',
    'npcs.edit.field.tagsPlaceholder': 'récurrent, faction-x',
    'npcs.edit.field.visibility': 'Visibilité',
    'npcs.edit.field.visibilityHelper':
      'Un PNJ secret reste totalement invisible des joueurs.',
    'npcs.edit.portraitImageAdd': 'Ajouter une photo',
    'npcs.edit.portraitImageReplace': 'Remplacer la photo',
    'npcs.edit.portraitImageRemove': 'Retirer la photo',
    'npcs.edit.portraitImageBusy': 'Optimisation…',
    'npcs.edit.portraitImageError': "Cette image n'a pas pu être lue.",
    'npcs.edit.portraitImageAlt': 'Portrait de',
    'npcs.edit.combat.enable': 'PNJ combattant',
    'npcs.edit.combat.cr': 'FP',
    'npcs.edit.combat.ac': 'CA',
    'npcs.edit.combat.hp': 'PV',
    'npcs.edit.combat.notes': 'Notes de combat',
    'npcs.edit.combat.linkMonster': 'Lier un monstre',
    'npcs.edit.combat.unlinkMonster': 'Délier',
    'npcs.edit.combat.linkMonsterHelper':
      'Le monstre lié remplit FP, CA et PV — qui restent modifiables — et donne au tracker son bloc complet.',
    'npcs.edit.cancel': 'Annuler',
    'npcs.edit.save': 'Enregistrer',
    'npcs.edit.saving': 'Enregistrement…',
    'npcs.edit.error.name': 'Donnez un nom au PNJ.',
    'npcs.edit.error.save': 'L’enregistrement a échoué. Vérifiez votre connexion et réessayez.',
    'npcs.edit.createdToast': 'PNJ créé',
    'npcs.edit.updatedToast': 'PNJ mis à jour',
    'encounters.create.npcs.title': 'PNJ',
    'encounters.create.npcs.intro':
      'Ajoutez des PNJ enregistrés de la campagne au combat.',
    'encounters.create.npcs.empty':
      'Aucun PNJ enregistré. Créez-en dans l’annuaire des PNJ.',
    'encounters.create.npcs.hpLabel': 'PV',
    'encounters.create.error.npcHp': 'Indiquez des PV valides pour chaque PNJ ajouté.',
    // Séances — JALON 23.2
    'sessions.back': 'Retour à la campagne',
    'sessions.title': 'Séances',
    'sessions.list.aria': 'Liste des séances de la campagne',
    'sessions.cta.plan': 'Planifier une séance',
    'sessions.empty.gm':
      'Aucune séance pour le moment. Planifie la première pour commencer à tenir le fil de la campagne.',
    'sessions.empty.member':
      "Aucune séance n'a encore été planifiée par le meneur.",
    'sessions.row.numberPrefix': 'Séance ',
    'sessions.status.planned': 'Planifiée',
    'sessions.status.active': 'En cours',
    'sessions.status.completed': 'Terminée',
    'sessions.status.cancelled': 'Annulée',
    'sessions.error.title': 'Lecture impossible',
    'sessions.error.body':
      "Les séances de cette campagne n'ont pas pu être chargées. Vérifie ta connexion et réessaye.",
    'sessions.error.retry': 'Réessayer',
    'sessions.create.title': 'Nouvelle séance',
    'sessions.create.intro':
      'Donne un titre à la séance. Le numéro est attribué automatiquement.',
    'sessions.create.titleField.label': 'Titre de la séance',
    'sessions.create.titleField.helper': 'Ex. « L’embuscade de la passe ».',
    'sessions.create.titleField.placeholder': 'Titre de la séance',
    'sessions.create.date.label': 'Date prévue',
    'sessions.create.date.helper': 'Optionnel — laisse vide si la date n’est pas fixée.',
    'sessions.create.cancel': 'Annuler',
    'sessions.create.submit': 'Planifier',
    'sessions.create.submitting': 'Création en cours…',
    'sessions.create.close': 'Fermer la fenêtre de planification',
    'sessions.create.error.titleRequired': 'Le titre est obligatoire.',
    'sessions.create.error.titleTooLong': 'Le titre est trop long (120 caractères max).',
    'sessions.create.error.generic':
      "La création n'a pas abouti. Vérifie ta connexion et réessaye.",
    // Écran séance — JALON 23.3
    'sessions.detail.back': 'Retour aux séances',
    'sessions.detail.error.title': 'Lecture impossible',
    'sessions.detail.error.body':
      "Cette séance n'a pas pu être chargée. Vérifie ta connexion et réessaye.",
    'sessions.detail.error.notFoundTitle': 'Séance introuvable',
    'sessions.detail.error.notFoundBody':
      "Cette séance n'existe plus ou son lien est invalide.",
    'sessions.tabs.aria': 'Onglets de la séance',
    'sessions.tab.notes': 'Notes',
    'sessions.tab.attendance': 'Présence',
    'sessions.tab.events': 'Événements',
    'sessions.tab.journal': 'Journal',
    'sessions.notes.label': 'Notes de séance',
    'sessions.notes.placeholder':
      'Note ici le déroulé de la séance, les décisions de la table, les pistes à suivre…',
    'sessions.notes.editorAria': 'Éditeur de notes de la séance',
    'sessions.notes.hint':
      'Enregistrement automatique. Le texte est conservé tel quel (Markdown) ; la mise en forme enrichie arrivera plus tard.',
    'sessions.notes.empty': 'Aucune note pour cette séance.',
    'sessions.notes.status.pending': 'Modifié',
    'sessions.notes.status.saving': 'Enregistrement…',
    'sessions.notes.status.saved': 'Enregistré',
    'sessions.notes.status.error': "Échec de l'enregistrement",
    'sessions.attendance.title': 'Présence à la séance',
    'sessions.attendance.empty': 'Aucun membre à la table pour le moment.',
    'sessions.attendance.status.saving': 'Enregistrement…',
    'sessions.attendance.status.saved': 'Enregistré',
    'sessions.attendance.status.error': "Échec de l'enregistrement",
    'sessions.journal.placeholder':
      'Le journal compilé de la séance apparaîtra ici à sa clôture.',
    'sessions.journal.emptyTitle': 'Aucun journal compilé',
    'sessions.journal.emptyBody':
      'Le journal narratif de cette séance sera compilé à partir des événements à sa clôture.',
    'sessions.journal.emptyBodyDm':
      'Le journal se compile automatiquement à la clôture de la séance. Vous pouvez aussi le compiler maintenant à partir des événements déjà enregistrés.',
    'sessions.journal.compile': 'Compiler le journal',
    'sessions.journal.recompile': 'Re-compiler depuis les événements',
    'sessions.journal.compiling': 'Compilation…',
    'sessions.journal.compileError':
      'La compilation du journal a échoué. Vérifiez votre connexion et réessayez.',
    'sessions.journal.compiledHint':
      'Compilé à partir des événements. Les événements restent la source de vérité.',
    'sessions.journal.edit': 'Éditer',
    'sessions.journal.editLabel': 'Journal (Markdown)',
    'sessions.journal.save': 'Enregistrer',
    'sessions.journal.saving': 'Enregistrement…',
    'sessions.journal.cancel': 'Annuler',
    'sessions.journal.saveError':
      "L'enregistrement du journal a échoué. Vérifiez votre connexion et réessayez.",
    'sessions.journal.editedHint':
      "Version éditée à la main. « Re-compiler depuis les événements » écrasera cette édition.",
    'sessions.journal.recompileConfirmTitle': 'Re-compiler le journal ?',
    'sessions.journal.recompileConfirmBody':
      'Cela réécrit le journal à partir des événements et écrase toute édition manuelle. Les événements restent la source de vérité.',
    'sessions.journal.recompileConfirm': 'Re-compiler et écraser',
    'sessions.journal.scope.legend': 'Ce que le récit embarque',
    'sessions.journal.scope.rolls': 'Les jets de dés',
    'sessions.journal.scope.monsterHp': 'Les points de vie des monstres',
    'sessions.journal.scope.dmOnly': 'Les coulisses du meneur',
    'sessions.journal.scope.help':
      'Décoché, ce type d’événement n’apparaît pas dans le récit. Rien n’est perdu : les événements restent la source de vérité, tu peux re-compiler autrement.',
    'sessions.action.start': 'Démarrer la séance',
    'sessions.action.end': 'Clore la séance',
    'sessions.action.starting': 'Démarrage…',
    'sessions.action.ending': 'Clôture…',
    'sessions.action.error.anotherActive':
      'Une autre séance est déjà en cours. Clos-la avant d’en démarrer une nouvelle.',
    'sessions.action.error.generic':
      "L'action n'a pas abouti. Vérifie ta connexion et réessaye.",
    // Cycle de vie d'une séance (M13)
    'sessions.edit.cta': 'Modifier la séance',
    'sessions.edit.title': 'Modifier la séance',
    'sessions.edit.close': 'Fermer la fenêtre de modification',
    'sessions.edit.save': 'Enregistrer',
    'sessions.edit.saving': 'Enregistrement…',
    'sessions.edit.number.label': 'Numéro de séance',
    'sessions.edit.number.helper':
      'Attribué automatiquement, mais modifiable — une campagne reprise en cours de route peut démarrer à la séance 42.',
    'sessions.edit.error.number': 'Le numéro doit être un entier supérieur à 0.',
    'sessions.edit.error.generic':
      "L'enregistrement n'a pas abouti. Vérifie ta connexion et réessaye.",
    'sessions.action.cancel': 'Annuler la séance',
    'sessions.action.cancelConfirm': 'Confirmer l’annulation',
    'sessions.action.cancelNotice':
      'Une séance annulée sort du récit de campagne : elle n’est ni à venir, ni terminée. Tu pourras la rouvrir.',
    'sessions.action.reopen': 'Rouvrir la séance',
    'sessions.action.reopening': 'Réouverture…',
    'campaigns.tip.editSession': 'Corriger le titre, le numéro ou la date.',
    'campaigns.tip.cancelSession':
      'Marquer cette séance comme n’ayant pas eu lieu, sans la clore.',
    'campaigns.tip.reopenSession':
      'Revenir sur une clôture ou une annulation erronée.',
    // Rencontres de combat — JALON 24.2
    'encounters.back': 'Retour à la campagne',
    'encounters.title': 'Rencontres',
    'encounters.list.aria': 'Liste des rencontres de la campagne',
    'encounters.cta.create': 'Créer une rencontre',
    'encounters.empty.gm':
      'Aucune rencontre pour le moment. Crée-en une pour préparer le prochain combat.',
    'encounters.empty.member':
      'Aucune rencontre pour le moment. Le meneur en créera une au prochain combat.',
    'encounters.row.participantsSuffix': 'participants',
    'encounters.row.participantsSuffixOne': 'participant',
    'encounters.status.planned': 'Préparée',
    'encounters.status.active': 'En cours',
    'encounters.status.completed': 'Terminée',
    'encounters.status.aborted': 'Abandonnée',
    'encounters.error.title': 'Lecture impossible',
    'encounters.error.body':
      "Les rencontres n'ont pas pu être chargées. Vérifie ta connexion et réessaye.",
    'encounters.error.retry': 'Réessayer',
    'encounters.create.title': 'Nouvelle rencontre',
    'encounters.create.intro':
      'Les personnages de la table sont ajoutés automatiquement. Ajoute les monstres à affronter.',
    'encounters.create.close': 'Fermer la fenêtre de création',
    'encounters.create.cancel': 'Annuler',
    'encounters.create.submit': 'Créer',
    'encounters.create.submitting': 'Création en cours…',
    'encounters.create.nameField.label': 'Nom de la rencontre',
    'encounters.create.nameField.helper': 'Ex. « L’embuscade des gobelins ».',
    'encounters.create.nameField.placeholder': 'Nom de la rencontre',
    'encounters.create.party.title': 'Personnages de la table',
    'encounters.create.party.empty':
      'Aucun personnage lié à la table. Les joueurs doivent lier leur fiche pour être ajoutés.',
    'encounters.create.party.loading': 'Chargement des personnages…',
    'encounters.create.party.error':
      "Certaines fiches n'ont pas pu être lues et ne seront pas ajoutées.",
    'encounters.create.party.hpLabel': 'PV',
    'encounters.create.monsters.title': 'Monstres',
    'encounters.create.monsters.intro':
      'Choisis dans le bestiaire (nom + PV préremplis) ou saisis à la main.',
    'encounters.create.monsters.nameLabel': 'Nom',
    'encounters.create.monsters.namePlaceholder': 'Ex. « Gobelin »',
    'encounters.create.monsters.hpLabel': 'PV',
    'encounters.create.monsters.hpPlaceholder': 'PV',
    'encounters.create.monsters.qtyLabel': 'Nombre',
    'encounters.create.monsters.addRow': 'Saisir à la main',
    'encounters.create.monsters.fromBestiary': 'Depuis le bestiaire',
    'encounters.create.monsters.removeRow': 'Retirer ce monstre',
    'encounters.create.error.nameRequired': 'Le nom est obligatoire.',
    'encounters.create.error.nameTooLong': 'Le nom est trop long (120 caractères max).',
    'encounters.create.error.noParticipants':
      'Ajoute au moins un personnage ou un monstre à la rencontre.',
    'encounters.create.error.monsterName': 'Chaque monstre doit avoir un nom.',
    'encounters.create.error.monsterHp': 'Les PV de chaque monstre doivent être supérieurs à 0.',
    'encounters.create.error.generic':
      "La création n'a pas abouti. Vérifie ta connexion et réessaye.",
    // Encounters — écran de combat (JALON 24.3)
    'encounters.detail.back': 'Retour aux rencontres',
    'encounters.detail.codex': 'Codex',
    'encounters.detail.roster': 'La compagnie',
    'encounters.detail.rosterTip': 'Voir l’état du groupe sans quitter le combat.',
    'campaigns.roster.overlay.subtitle': 'L’état du groupe, sans quitter la partie.',
    'campaigns.roster.overlay.close': 'Fermer la compagnie',
    'campaigns.roster.overlay.empty': 'Personne à la table pour l’instant.',
    'encounters.detail.codexTip': 'Consulter une règle ou un monstre sans quitter le combat.',
    'encounters.detail.round': 'Round',
    'encounters.detail.error.title': 'Lecture impossible',
    'encounters.detail.error.body':
      'La rencontre n’a pas pu être chargée. Vérifie ta connexion et réessaye.',
    'encounters.detail.error.notFoundTitle': 'Rencontre introuvable',
    'encounters.detail.error.notFoundBody':
      'Cette rencontre n’existe plus ou son identifiant est invalide.',
    'encounters.detail.error.retry': 'Réessayer',
    'encounters.action.rollInit': 'Lancer l’initiative',
    'encounters.action.rollingInit': 'Lancement…',
    'encounters.action.reroll': 'Relancer',
    'encounters.action.start': 'Démarrer le combat',
    'encounters.action.starting': 'Démarrage…',
    'encounters.action.endTurn': 'Fin du tour',
    'encounters.action.end': 'Clôturer le combat',
    'encounters.action.ending': 'Clôture…',
    'encounters.action.cancelEnd': 'Annuler',
    // Encounters — cycle de vie réparable (M7 de l'audit de malléabilité).
    'encounters.action.previousTurn': 'Tour précédent',
    'encounters.action.abort': 'Abandonner le combat',
    'encounters.action.reopen': 'Rouvrir le combat',
    'encounters.action.reopening': 'Réouverture…',
    'encounters.detail.closedHint':
      'Cette rencontre est close. La rouvrir la remet en cours, là où elle s’était arrêtée.',
    'encounters.row.actions': 'Gérer la rencontre',
    'encounters.row.manageTitle': 'Gérer la rencontre',
    'encounters.row.manageCloseAria': 'Fermer la gestion de la rencontre',
    'encounters.row.renameLabel': 'Nom de la rencontre',
    'encounters.row.renameSave': 'Renommer',
    'encounters.row.delete': 'Supprimer la rencontre',
    'encounters.row.deleteConfirm': 'Confirmer la suppression',
    'encounters.action.error.anotherActive':
      'Une autre rencontre est déjà en cours. Clôture-la avant d’en démarrer une nouvelle.',
    'encounters.action.error.noParticipants':
      'Ajoute au moins un participant avant de démarrer le combat.',
    'encounters.action.error.generic':
      'L’action n’a pas abouti. Vérifie ta connexion et réessaye.',
    'encounters.outcome.prompt': 'Issue du combat',
    'encounters.outcome.victory': 'Victoire',
    'encounters.outcome.defeat': 'Défaite',
    'encounters.outcome.fled': 'Fuite',
    'encounters.turnOrder.title': 'Ordre d’initiative',
    'encounters.turnOrder.aria': 'Ordre d’initiative des participants',
    'encounters.turnOrder.empty': 'Lance l’initiative pour établir l’ordre des tours.',
    'encounters.turnOrder.currentTurn': 'Tour en cours',
    'encounters.participant.initLabel': 'Init.',
    'encounters.participant.hpLabel': 'PV',
    'encounters.participant.typeMonster': 'Monstre',
    // Encounters — contrôle MJ des PV / états (JALON 24.4, step 7)
    'encounters.control.open': 'PV / États',
    'encounters.control.hpTitle': 'Points de vie',
    'encounters.control.amount': 'Montant',
    'encounters.control.damage': 'Dégâts',
    'encounters.control.heal': 'Soin',
    'encounters.control.applying': 'Application…',
    'encounters.control.conditionsTitle': 'États',
    'encounters.control.noConditions': 'Aucun état actif.',
    'encounters.control.addCondition': 'Appliquer un état',
    'encounters.control.closeAria': 'Fermer le contrôle',
    'encounters.control.viewStatBlock': 'Voir la fiche de créature',
    'encounters.control.statBlockCloseAria': 'Fermer la fiche de créature',
    'encounters.control.tempHp': '+ PV temp.',
    'encounters.control.customCondition': 'Autre état',
    'encounters.control.customConditionPlaceholder': 'Marqué par le Chasseur…',
    'encounters.control.customConditionAdd': 'Poser',
    'encounters.control.noteTitle': 'Note du combattant',
    'encounters.control.notePlaceholder': 'Celui-ci porte la clé…',
    'encounters.control.noteSave': 'Enregistrer la note',
    // Encounters — édition d'un combattant en lice (M2/M3 de l'audit de
    // malléabilité) : renommer, corriger des PV mal tapés, saisir l'initiative
    // annoncée à voix haute, retirer celui qui prend la fuite.
    // Encounters — contrôle des PV d'un PJ depuis le tracker (M5). L'écriture
    // emprunte la voie omni-edit MJ, journalisée comme telle.
    'encounters.playerControl.badge': 'Fiche du joueur',
    'encounters.playerControl.help':
      'Les points de vie sont appliqués sur sa fiche, et l’édition est journalisée.',
    'encounters.playerControl.loading': 'Lecture de la fiche…',
    'encounters.playerControl.unreadable':
      'Fiche illisible : le joueur l’a peut-être déliée de la campagne.',
    'encounters.playerControl.open': 'Points de vie',
    'encounters.control.editTitle': 'Modifier le combattant',
    'encounters.control.editName': 'Nom',
    'encounters.control.editInitiative': 'Initiative',
    'encounters.control.editCurrentHp': 'PV actuels',
    'encounters.control.editMaxHp': 'PV maximum',
    'encounters.control.editSave': 'Enregistrer les corrections',
    'encounters.control.remove': 'Retirer du combat',
    'encounters.control.removeConfirm': 'Confirmer le retrait',
    'encounters.add.open': 'Ajouter un combattant',
    'encounters.add.title': 'Nouveau combattant',
    'encounters.add.intro':
      'Le renfort arrive en fin d’ordre, initiative à 0. Saisis ou relance la sienne ensuite.',
    'encounters.add.closeAria': 'Fermer l’ajout de combattant',
    'encounters.add.nameLabel': 'Nom',
    'encounters.add.namePlaceholder': 'Chef gobelin…',
    'encounters.add.hpLabel': 'PV',
    'encounters.add.typeLabel': 'Type',
    'encounters.add.typeMonster': 'Monstre',
    'encounters.add.typeNpc': 'PNJ',
    'encounters.add.fromBestiary': 'Depuis le bestiaire',
    'encounters.add.submit': 'Ajouter au combat',
    'encounters.add.cancel': 'Annuler',
    'encounters.add.error.name': 'Donne un nom à ce combattant.',
    'encounters.add.error.hp': 'Indique des PV valides (au moins 1).',
    // Encounters — hand-off des dégâts physiques (JALON 24.4, step 7b). Le MJ
    // applique les jets physiques récents des joueurs sur une cible qu'il choisit.
    'encounters.handoff.title': 'Dégâts à appliquer',
    'encounters.handoff.help':
      'Jets récents des joueurs. Choisis une cible pour appliquer les dégâts.',
    'encounters.handoff.aria': 'Dégâts à appliquer',
    'encounters.handoff.attackPrefix': 'Att',
    'encounters.handoff.damageSuffix': 'dégâts',
    'encounters.handoff.attackInfo': 'Jet d’attaque — compare à la CA de la cible.',
    'encounters.handoff.apply': 'Appliquer à…',
    'encounters.handoff.chooseTarget': 'Cible',
    'encounters.handoff.noTargets': 'Aucune cible disponible.',
    'encounters.handoff.dismiss': 'Ignorer',
    'encounters.handoff.unknownActor': 'Joueur',
    // Encounters — vue de groupe joueur (JALON 24.4, step 8). Lisible par tous.
    'encounters.party.title': 'État du groupe',
    'encounters.party.aria': 'État de santé des participants',
    'encounters.party.allies': 'Votre groupe',
    'encounters.party.enemies': 'Adversaires',
    'encounters.party.empty': 'Aucun participant.',
    // Journal — narration auto (plan 25.1). Placeholders `{xxx}` substitués par
    // `fillTemplate`. Terminologie officielle FR : « coup critique »/« échec
    // critique », « sort mineur » (= cantrip), « emplacement » (spell slot),
    // « Round », « Victoire/Défaite/Fuite ».
    'journal.section.exploration': 'Exploration',
    'journal.section.combat': 'Combat — {name}',
    'journal.section.combatOutcome.victory': 'Issue : victoire.',
    'journal.section.combatOutcome.defeat': 'Issue : défaite.',
    'journal.section.combatOutcome.fled': 'Issue : fuite.',
    'journal.empty': '_Aucun événement enregistré pour cette séance._',
    'journal.actor.dm': 'Le meneur',
    'journal.actor.someone': 'Quelqu’un',
    'journal.tpl.sessionStart': 'La séance {number} — « {title} » — commence.',
    'journal.tpl.sessionEnd': 'La séance {number} — « {title} » — se termine.',
    'journal.tpl.turnStart': 'Au tour de **{name}** (round {round}).',
    'journal.tpl.rollAttackCrit':
      '{actor} attaque et obtient un **coup critique** ({label}, total {total}) !',
    'journal.tpl.rollAttackFumble':
      '{actor} attaque et subit un **échec critique** ({label}, total {total}).',
    'journal.tpl.rollAttack': '{actor} attaque ({label}) — total {total}.',
    'journal.tpl.rollDamage': '{actor} inflige {total} dégâts ({label}).',
    'journal.tpl.rollSave': '{actor} tente une sauvegarde ({label}) — total {total}.',
    'journal.tpl.rollCheck': '{actor} tente un test ({label}) — total {total}.',
    'journal.tpl.rollDeathSave':
      '{actor} fait une sauvegarde contre la mort ({label}) — total {total}.',
    'journal.tpl.rollGeneric': '{actor} effectue un jet ({label}) — total {total}.',
    'journal.tpl.spellCast':
      '{actor} lance **{spell}** (niveau {level}, emplacement de niveau {slot} consommé).',
    'journal.tpl.spellCantrip': '{actor} lance le sort mineur **{spell}**.',
    'journal.tpl.hpDamage': '{actor} subit {amount} dégâts — PV : {before} → {after}.',
    'journal.tpl.hpHeal': '{actor} récupère {amount} PV — PV : {before} → {after}.',
    'journal.tpl.tempHp': '{actor} gagne {amount} PV temporaires.',
    'journal.tpl.conditionAdd': '{actor} est désormais **{condition}**.',
    'journal.tpl.conditionRemove': '{actor} n’est plus **{condition}**.',
    'journal.tpl.slotConsumedOne': '{actor} consomme un emplacement de niveau {level}.',
    'journal.tpl.slotConsumedMany': '{actor} consomme {count} emplacements de niveau {level}.',
    'journal.tpl.slotRestoredOne': '{actor} récupère un emplacement de niveau {level}.',
    'journal.tpl.slotRestoredMany': '{actor} récupère {count} emplacements de niveau {level}.',
    'journal.tpl.itemAcquiredOne': '{actor} récupère **{item}**.',
    'journal.tpl.itemAcquiredMany': '{actor} récupère **{item}** (×{qty}).',
    'journal.tpl.itemRemovedOne': '{actor} se sépare de **{item}**.',
    'journal.tpl.itemRemovedMany': '{actor} se sépare de **{item}** (×{qty}).',
    'journal.tpl.monsterHpChangeDamage': '**{name}** subit {amount} dégâts — PV : {before} → {after}.',
    'journal.tpl.monsterHpChangeHeal': '**{name}** récupère {amount} PV — PV : {before} → {after}.',
    // Journal — vue agrégée campagne (plan 25.4)
    'journal.aggregate.title': 'Journal de campagne',
    'journal.aggregate.subtitle': 'Le récit compilé de vos séances, dans l’ordre.',
    'journal.aggregate.back': 'Retour à la campagne',
    'journal.aggregate.export': 'Exporter (.md)',
    'journal.aggregate.exportSession': 'Exporter cette séance',
    'journal.aggregate.empty':
      'Aucune séance terminée pour l’instant. Le journal de campagne se remplira à mesure que vous clôturez des séances.',
    'journal.aggregate.sessionNumberPrefix': 'Séance ',
    'journal.aggregate.notCompiled': 'Journal non encore compilé pour cette séance.',
    'journal.aggregate.expand': 'Déplier',
    'journal.aggregate.collapse': 'Replier',
    'journal.aggregate.error': 'Le chargement du journal a échoué.',
    'journal.aggregate.retry': 'Réessayer',
    // Avoir
    'avoir.customItem.placeholder': 'Mon trésor personnel',
    'sheet.avoir.attunement.title': 'Harmonisation',
    'sheet.avoir.attunement.count': '{count} / {cap} objets liés',
    'sheet.avoir.attunement.empty': 'Aucun objet harmonisé.',
    'sheet.avoir.attunement.atCap': 'Limite atteinte',
    // Mode Avoir — inventaire, bourse, ajout/création, détail
    'sheet.avoir.close': 'Fermer',
    'sheet.avoir.cancel': 'Annuler',
    'sheet.avoir.quantity': 'Quantité',
    'sheet.avoir.unknownError': 'Erreur inconnue',
    'sheet.avoir.equipped': 'Équipé',
    'sheet.avoir.unequipped': 'Déséquipé',
    'sheet.avoir.equip': 'Équiper',
    'sheet.avoir.unequip': 'Déséquiper',
    'sheet.avoir.attuned': 'Lié',
    'sheet.avoir.add.addedTitle': 'Objet ajouté',
    'sheet.avoir.add.addedSub': '{qty} × {name}',
    'sheet.avoir.add.failTitle': 'Ajout impossible',
    'sheet.avoir.add.browseTitle': 'Ajouter un objet',
    'sheet.avoir.add.customTitle': 'Créer un objet maison',
    'sheet.avoir.add.browseSubtitle': '{n} objets + {m} magiques',
    'sheet.avoir.add.customSubtitle': 'Référence personnelle',
    'sheet.avoir.add.searchPlaceholder': 'Rechercher un objet…',
    'sheet.avoir.add.noMatch': 'Aucun objet ne correspond.',
    'sheet.avoir.add.customCta': '+ Maison',
    'sheet.avoir.add.confirm': 'Ajouter',
    'sheet.avoir.coin.cu': 'Cu',
    'sheet.avoir.coin.ar': 'Ar',
    'sheet.avoir.coin.el': 'Él',
    'sheet.avoir.coin.or': 'Or',
    'sheet.avoir.coin.pl': 'Pl',
    'sheet.avoir.weight.title': 'Poids transporté',
    'sheet.avoir.weight.normal': 'Charge normale',
    'sheet.avoir.weight.encumbered': 'Encombré',
    'sheet.avoir.weight.heavilyEncumbered': 'Fortement encombré',
    'sheet.avoir.coins.title': 'Bourse',
    'sheet.avoir.coins.purseToast': 'Bourse — {coin}',
    'sheet.avoir.coins.updated': 'Mise à jour',
    'sheet.avoir.coins.editAria': 'Éditer pièces {coin}',
    'sheet.avoir.coins.totalValue': 'Valeur totale ≈ {gp} po',
    'sheet.avoir.inv.title': 'Inventaire',
    'sheet.avoir.inv.addCta': '+ Objet',
    'sheet.avoir.inv.searchPlaceholder': 'Rechercher…',
    'sheet.avoir.inv.empty': 'Inventaire vide. Touche « + Objet » pour ajouter un premier objet.',
    'sheet.avoir.inv.noMatchQuery': 'Aucun objet ne correspond à « {query} ».',
    'sheet.avoir.inv.unresolved': 'Objet non résolu — vérifier la base.',
    'sheet.avoir.inv.notFound': '(introuvable) {id}',
    'sheet.avoir.inv.acMeta': 'CA {ac}',
    'sheet.avoir.inv.acDexMeta': ' + DEX max {n}',
    'sheet.avoir.group.weapon': 'Armes',
    'sheet.avoir.group.armor': 'Armures & boucliers',
    'sheet.avoir.group.tool': 'Outils',
    'sheet.avoir.group.pack': 'Sacs & kits',
    'sheet.avoir.group.gear': 'Équipement',
    'sheet.avoir.group.magic': 'Objets magiques',
    'sheet.avoir.group.misc': 'Divers',
    'sheet.avoir.group.unknown': 'Inconnus',
    'sheet.avoir.detail.removed': 'Objet retiré',
    'sheet.avoir.detail.attuneLimitTitle': 'Limite de liens',
    'sheet.avoir.detail.attuneLimitSub': 'Maximum de {n} objets liés simultanément.',
    'sheet.avoir.detail.linkBroken': 'Lien rompu',
    'sheet.avoir.detail.linkEstablished': 'Lien établi',
    'sheet.avoir.detail.unresolvedItem': 'Objet non résolu',
    'sheet.avoir.detail.weight': 'Poids',
    'sheet.avoir.detail.cost': 'Coût',
    'sheet.avoir.detail.damage': 'Dégâts',
    'sheet.avoir.detail.ac': 'CA',
    'sheet.avoir.detail.acDex': ' + DEX (max {n})',
    'sheet.avoir.detail.noDescription': 'Aucun descriptif détaillé pour cet objet.',
    'sheet.avoir.detail.decreaseQty': 'Diminuer la quantité',
    'sheet.avoir.detail.increaseQty': 'Augmenter la quantité',
    'sheet.avoir.detail.notes': 'Notes',
    'sheet.avoir.detail.notesPlaceholder': 'Origine, histoire, runes gravées…',
    'sheet.avoir.detail.unlink': 'Délier',
    'sheet.avoir.detail.link': 'Lier',
    'sheet.avoir.detail.confirmRemove': 'Confirmer le retrait',
    'sheet.avoir.detail.remove': 'Retirer',
    'sheet.avoir.customForm.invalidSchema': 'Schéma invalide : {errors}',
    'sheet.avoir.customForm.created': 'Objet maison créé',
    'sheet.avoir.customForm.failTitle': 'Création impossible',
    'sheet.avoir.customForm.name': 'Nom',
    'sheet.avoir.customForm.category': 'Catégorie',
    'sheet.avoir.customForm.weight': 'Poids (kg)',
    'sheet.avoir.customForm.description': 'Description (optionnelle)',
    'sheet.avoir.customForm.descPlaceholder': 'Notes, propriétés, histoire…',
    'sheet.avoir.customForm.submit': 'Créer & ajouter',
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
    'customContent.list.export': 'Exporter',
    'customContent.list.exportTip': 'Télécharge ce pack en JSON, réimportable tel quel.',
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
    'customContent.category.magic-items': 'Objets magiques',
    'customContent.category.monsters': 'Monstres',
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
    // Magic item — pack editor (objets magiques, directive 2026-06-27)
    'customContent.editor.magicItems.add': 'Ajouter un objet magique',
    'customContent.editor.magicItems.empty':
      'Aucun objet magique ajouté pour l’instant.',
    'customContent.editor.magicItems.remove': 'Retirer',
    'customContent.editor.magicItemForm.title': 'Nouvel objet magique',
    'customContent.editor.magicItemForm.id': 'Identifiant',
    'customContent.editor.magicItemForm.idHelper':
      'Slug unique en minuscules (ex. epee-des-flammes).',
    'customContent.editor.magicItemForm.nameFr': 'Nom (FR)',
    'customContent.editor.magicItemForm.nameEn': 'Nom (EN, optionnel)',
    'customContent.editor.magicItemForm.category': 'Catégorie',
    'customContent.editor.magicItemForm.categoryPlaceholder':
      'Choisir une catégorie…',
    'customContent.editor.magicItemForm.rarity': 'Rareté',
    'customContent.editor.magicItemForm.rarityPlaceholder':
      'Choisir une rareté…',
    'customContent.editor.magicItemForm.attunement': 'Nécessite l’harmonisation',
    'customContent.editor.magicItemForm.attunementHelper':
      'Coché : l’objet doit être harmonisé avant de profiter de ses effets.',
    'customContent.editor.magicItemForm.magicDescriptionFr': 'Effet magique (FR)',
    'customContent.editor.magicItemForm.magicDescriptionEn':
      'Effet magique (EN, optionnel)',
    'customContent.editor.magicItemForm.magicDescriptionHelper':
      'Décris les pouvoirs magiques de l’objet (bonus, charges, sorts…).',
    'customContent.editor.magicItemForm.hasDescription':
      'Ajouter une description d’ambiance',
    'customContent.editor.magicItemForm.hasDescriptionHelper':
      'Texte non mécanique (apparence, histoire) — optionnel.',
    'customContent.editor.magicItemForm.descriptionFr': 'Description (FR)',
    'customContent.editor.magicItemForm.descriptionEn':
      'Description (EN, optionnel)',
    'customContent.editor.magicItemForm.cancel': 'Annuler',
    'customContent.editor.magicItemForm.confirm': 'Confirmer l’objet magique',
    'customContent.editor.magicItemForm.error.idRequired':
      'L’identifiant est obligatoire.',
    'customContent.editor.magicItemForm.error.idFormat':
      'Slug en minuscules, chiffres et tirets uniquement.',
    'customContent.editor.magicItemForm.error.nameFrRequired':
      'Le nom français est obligatoire.',
    'customContent.editor.magicItemForm.error.categoryRequired':
      'Choisis une catégorie.',
    'customContent.editor.magicItemForm.error.rarityRequired':
      'Choisis une rareté.',
    'customContent.editor.magicItemForm.error.magicDescriptionRequired':
      'L’effet magique est obligatoire.',
    // Monster — pack editor (bestiaire, directive 2026-06-27)
    'customContent.editor.monsters.add': 'Ajouter un monstre',
    'customContent.editor.monsters.empty':
      'Aucun monstre ajouté pour l’instant.',
    'customContent.editor.monsters.remove': 'Retirer',
    'customContent.editor.monsterForm.title': 'Nouveau monstre',
    'customContent.editor.monsterForm.id': 'Identifiant',
    'customContent.editor.monsterForm.idHelper':
      'Slug unique en minuscules (ex. gobelin-eclaireur).',
    'customContent.editor.monsterForm.nameFr': 'Nom (FR)',
    'customContent.editor.monsterForm.nameEn': 'Nom (EN, optionnel)',
    'customContent.editor.monsterForm.size': 'Taille',
    'customContent.editor.monsterForm.type': 'Type',
    'customContent.editor.monsterForm.typeHelper':
      'Catégorie de créature (ex. humanoïde, bête, mort-vivant).',
    'customContent.editor.monsterForm.alignmentFr': 'Alignement (FR)',
    'customContent.editor.monsterForm.alignmentEn': 'Alignement (EN, optionnel)',
    'customContent.editor.monsterForm.ac': 'Classe d’armure',
    'customContent.editor.monsterForm.hpAvg': 'Points de vie (moyenne)',
    'customContent.editor.monsterForm.hpFormula': 'Formule de PV',
    'customContent.editor.monsterForm.speedLegend': 'Vitesses (en pieds)',
    'customContent.editor.monsterForm.speedWalk': 'Marche',
    'customContent.editor.monsterForm.speedFly': 'Vol',
    'customContent.editor.monsterForm.speedSwim': 'Nage',
    'customContent.editor.monsterForm.speedClimb': 'Escalade',
    'customContent.editor.monsterForm.speedBurrow': 'Creusement',
    'customContent.editor.monsterForm.abilitiesLegend': 'Caractéristiques',
    'customContent.editor.monsterForm.sensesLegend': 'Sens (en pieds)',
    'customContent.editor.monsterForm.passivePerception': 'Perception passive',
    'customContent.editor.monsterForm.darkvision': 'Vision dans le noir',
    'customContent.editor.monsterForm.blindsight': 'Vision aveugle',
    'customContent.editor.monsterForm.tremorsense': 'Perception des vibrations',
    'customContent.editor.monsterForm.truesight': 'Vision véritable',
    'customContent.editor.monsterForm.cr': 'Facteur de puissance',
    'customContent.editor.monsterForm.crHelper':
      'FP — valeurs fractionnaires possibles (0,125 = 1/8, 0,5 = 1/2).',
    'customContent.editor.monsterForm.xp': 'Points d’expérience',
    'customContent.editor.monsterForm.resistances': 'Résistances aux dégâts',
    'customContent.editor.monsterForm.immunities': 'Immunités aux dégâts',
    'customContent.editor.monsterForm.vulnerabilities': 'Vulnérabilités',
    'customContent.editor.monsterForm.conditionImmunities':
      'Immunités aux états',
    'customContent.editor.monsterForm.languages': 'Langues',
    'customContent.editor.monsterForm.listHelper':
      'Ajoute chaque entrée puis valide — clique une étiquette pour la retirer.',
    'customContent.editor.monsterForm.listEmpty': 'Aucune entrée.',
    'customContent.editor.monsterForm.listAdd': 'Ajouter',
    'customContent.editor.monsterForm.traits': 'Traits',
    'customContent.editor.monsterForm.traitAdd': 'Ajouter un trait',
    'customContent.editor.monsterForm.actions': 'Actions',
    'customContent.editor.monsterForm.actionAdd': 'Ajouter une action',
    'customContent.editor.monsterForm.reactions': 'Réactions',
    'customContent.editor.monsterForm.reactionAdd': 'Ajouter une réaction',
    'customContent.editor.monsterForm.legendaryActions': 'Actions légendaires',
    'customContent.editor.monsterForm.legendaryAdd':
      'Ajouter une action légendaire',
    'customContent.editor.monsterForm.namedEmpty': 'Aucune entrée.',
    'customContent.editor.monsterForm.namedRemove': 'Retirer',
    'customContent.editor.monsterForm.entryNameFr': 'Nom (FR)',
    'customContent.editor.monsterForm.entryNameEn': 'Nom (EN, optionnel)',
    'customContent.editor.monsterForm.entryDescFr': 'Description (FR)',
    'customContent.editor.monsterForm.entryDescEn': 'Description (EN, optionnel)',
    'customContent.editor.monsterForm.cancel': 'Annuler',
    'customContent.editor.monsterForm.confirm': 'Confirmer le monstre',
    'customContent.editor.monsterForm.error.idRequired':
      'L’identifiant est obligatoire.',
    'customContent.editor.monsterForm.error.idFormat':
      'Slug en minuscules, chiffres et tirets uniquement.',
    'customContent.editor.monsterForm.error.nameFrRequired':
      'Le nom français est obligatoire.',
    'customContent.editor.monsterForm.error.typeRequired':
      'Le type est obligatoire.',
    'customContent.editor.monsterForm.error.alignmentRequired':
      'L’alignement français est obligatoire.',
    'customContent.editor.monsterForm.error.hpFormulaRequired':
      'La formule de PV est obligatoire.',
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
    // Edit mode (JALON 3C.10)
    'customContent.editor.editMode.title': 'Modifier le pack',
    'customContent.editor.editMode.subtitle':
      'Édite le contenu d’un pack importé. Le `save` écrasera la version actuelle.',
    'customContent.editor.editMode.notFound':
      'Pack introuvable. Il a peut-être été supprimé.',
    'customContent.editor.editMode.errorTitle':
      'Impossible de charger le pack',
    'customContent.editor.editMode.back': 'Retour à la liste',
    'customContent.editor.meta.idHelperEdit':
      'Identifiant verrouillé : pour le renommer, exporte puis ré-importe sous un nouvel id.',
    'customContent.editor.entityRow.edit': 'Modifier',
    'customContent.list.edit': 'Modifier',
    // Infobulles explicites — fiche (sheet)
    'sheet.tip.editPreparation': 'Modifie la liste de tes sorts préparés.',
    'sheet.tip.openSpellDetail': 'Ouvre la fiche détaillée du sort.',
    'sheet.tip.chooseSlotLevel': 'Choisis le niveau d’emplacement utilisé.',
    'sheet.tip.spellAttackRoll': 'Lance un d20 plus ton bonus d’attaque de sort.',
    'sheet.tip.castSpell': 'Lance le sort et consomme la ressource requise.',
    'sheet.tip.restoreAllSlots': 'Restaure tous les emplacements de sort.',
    'sheet.tip.restorePactSlots': 'Restaure tous les emplacements de pacte.',
    'sheet.tip.consumeSlot': 'Consomme cet emplacement.',
    'sheet.tip.restoreSlot': 'Restaure cet emplacement.',
    'sheet.tip.openDetail': 'Ouvre le détail de cet élément.',
    'sheet.tip.toggleInspiration': 'Accorde ou retire l’inspiration du personnage.',
    'sheet.tip.rollSave': 'Lance un jet de sauvegarde pour cette caractéristique.',
    'sheet.tip.rollSkill': 'Lance un test de cette compétence.',
    'sheet.tip.closeModal': 'Ferme cette fenêtre.',
    'sheet.tip.decrement': 'Diminue la quantité de un.',
    'sheet.tip.increment': 'Augmente la quantité de un.',
    'sheet.tip.toggleEquip': 'Équipe ou retire cet objet.',
    'sheet.tip.toggleAttune': 'Lie cet objet magique à ton personnage.',
    'sheet.tip.removeItem': 'Retire cet objet de l’inventaire.',
    'sheet.tip.editCoin': 'Modifie le nombre de pièces.',
    'sheet.tip.addItem': 'Ajoute un objet à ton inventaire.',
    'sheet.tip.createCustomItem': 'Crée un objet personnalisé maison.',
    // Infobulles explicites — campagnes (campaigns)
    'campaigns.tip.viewStatBlock': 'Voir la fiche de combat de la créature.',
    'campaigns.tip.applyDamage': 'Retirer ce nombre de points de vie.',
    'campaigns.tip.applyHeal': 'Rendre ce nombre de points de vie.',
    'campaigns.tip.quickDamage': 'Infliger ces dégâts en un toucher.',
    'campaigns.tip.quickHeal': 'Soigner ce montant en un toucher.',
    'campaigns.tip.grantTempHp': 'Accorder ce montant en points de vie temporaires (on garde le plus avantageux).',
    'campaigns.tip.customCondition': 'Poser un état inventé par la table.',
    'campaigns.tip.saveNote': 'Enregistrer cette note sur le combattant.',
    'campaigns.tip.conditionAdd': 'Appliquer cet état à la créature.',
    'campaigns.tip.conditionRemove': 'Retirer cet état de la créature.',
    'campaigns.tip.rollInit': 'Lancer l’initiative de tous les combattants.',
    'campaigns.tip.startCombat': 'Démarrer le combat et figer l’ordre des tours.',
    'campaigns.tip.endTurn': 'Passer au combattant suivant.',
    'campaigns.tip.endCombat': 'Clôturer le combat et choisir son issue.',
    'campaigns.tip.reroll': 'Relancer l’initiative de ce combattant.',
    'campaigns.tip.controlParticipant': 'Ajuster ses points de vie et ses états.',
    'campaigns.tip.previousTurn': 'Revenir au combattant précédent — on a oublié quelque chose.',
    'campaigns.tip.abortCombat': 'Clore sans issue : le combat n’a pas eu de fin.',
    'campaigns.tip.reopenCombat': 'Remettre ce combat en cours, là où il s’était arrêté.',
    'campaigns.tip.manageEncounter': 'Renommer ou supprimer cette rencontre.',
    'campaigns.tip.addParticipant': 'Faire entrer un combattant dans une rencontre déjà lancée.',
    'campaigns.tip.editParticipant': 'Corriger son nom, ses points de vie ou son initiative.',
    'campaigns.tip.removeParticipant': 'Le sortir de la rencontre — il disparaît de l’ordre des tours.',
    'campaigns.tip.openJournal': 'Ouvrir le journal de la campagne.',
    'campaigns.tip.openHandouts': 'Ouvrir les documents partagés avec la table.',
    'campaigns.tip.openNpcs': 'Ouvrir l’annuaire des personnages non-joueurs.',
    'campaigns.tip.openSessions': 'Ouvrir la liste des séances de jeu.',
    'campaigns.tip.openEncounters': 'Ouvrir la liste des rencontres de combat.',
    'campaigns.tip.openMaps': 'Ouvrir le mode carte de la campagne.',
    'campaigns.tip.viewMaps':
      'Voir les cartes de la campagne, telles que le meneur les projette.',
    'campaigns.tip.openSettings':
      'Modifier le nom, le mode de dés et les variantes 5e de la table.',
    'campaigns.tip.promoteGm': 'Donner à ce joueur les pleins pouvoirs de meneur.',
    'campaigns.tip.copyInviteCode': 'Copier le code d’invitation dans le presse-papiers.',
    'campaigns.tip.shareInviteLink':
      'Partager un lien d’invitation — le code y est déjà prérempli.',
    'campaigns.tip.linkCharacter': 'Choisir le personnage que vous jouez ici.',
    'campaigns.tip.openOwnSheet': 'Consulter votre fiche de personnage.',
    'campaigns.tip.createCharacter':
      'Créer un nouveau personnage, lié automatiquement à cette campagne.',
    'campaigns.tip.editNpc': 'Modifier la fiche de ce personnage non-joueur.',
    'campaigns.tip.deleteNpc': 'Supprimer définitivement ce personnage non-joueur.',
    'campaigns.tip.duplicateNpc':
      'Recopier ce personnage non-joueur dans une autre campagne que tu mènes.',
    'campaigns.tip.editRelations': 'Modifier les liens avec les personnages joueurs.',
    'campaigns.tip.archiveHandout': 'Archiver ce document et le masquer aux joueurs.',
    'campaigns.tip.startSession': 'Démarrer la séance et journaliser le jeu.',
    'campaigns.tip.endSession': 'Clôturer la séance et compiler le journal.',
    'campaigns.tip.applyHandoff': 'Choisir la cible qui subira ces dégâts.',
    'campaigns.tip.handoffTarget': 'Appliquer les dégâts à cette créature.',
    'campaigns.tip.removeMonsterRow': 'Retirer ce monstre de la rencontre.',
    'campaigns.tip.fromBestiary': 'Préremplir un monstre depuis le bestiaire.',
    'campaigns.tip.demoteGm':
      'Lui retirer l’autorité de meneur. Il reste joueur à la table.',
    'campaigns.tip.kickMember':
      'Retirer ce joueur de la campagne. Sa fiche lui reste acquise.',
    'campaigns.tip.rotateInviteCode':
      'Révoquer le code actuel et en générer un nouveau.',
    // Infobulles explicites — carte (map)
    'map.tip.placeAoe': 'Choisir cette forme de zone d’effet à poser.',
    'map.tip.rotateAoeCcw': 'Pivoter la zone de 15° vers la gauche.',
    'map.tip.rotateAoeCw': 'Pivoter la zone de 15° vers la droite.',
    'map.tip.shrinkAoe': 'Réduire la zone d’une case.',
    'map.tip.growAoe': 'Agrandir la zone d’une case.',
    'map.tip.sphereNoRotation': 'Une sphère n’a pas d’orientation.',
    'map.tip.deleteAoe': 'Supprimer cette zone d’effet.',
    'map.tip.removeFromInitiative': 'Retirer ce combattant de l’initiative.',
    'map.tip.addMonster': 'Poser un monstre du bestiaire sur la carte.',
    'map.tip.snapToGrid': 'Aligner les jetons au centre de leur case.',
    'map.tip.snapNeedsGrid': 'Affichez d’abord la grille pour aimanter les jetons.',
    'map.tip.toggleGrid': 'Afficher ou masquer la grille de la carte.',
    'map.tip.toggleFog': 'Activer ou couper le voile de brouillard.',
    'map.tip.toggleLos': 'Activer ou couper la ligne de vue (occlusion par les murs).',
    'map.tip.viewAsPlayer': 'Voir la carte comme la table la voit, avant de dévoiler.',
    'map.tip.toggleLighting': 'Afficher ou masquer la teinte des sources lumineuses.',
    'map.tip.toggleMeasure': 'Mesurer une distance en mètres sur la carte.',
    'map.tip.deleteMap': 'Supprimer définitivement cette carte.',
    // Écrans carte (map) — communs + cloud + import + TV
    'map.common.loading': 'Chargement…',
    'map.common.loadingMap': 'Chargement de la carte…',
    'map.common.errorPrefix': 'Erreur : ',
    'map.common.missingCid':
      'URL invalide : il manque l’identifiant de campagne (`cid`).',
    'map.common.invalidSlug':
      'Identifiant invalide (slug kebab-case : lettres minuscules, chiffres, tirets).',
    'map.common.nameRequired': 'Le nom est requis.',
    'map.common.slugLabel': 'Identifiant (slug)',
    'map.common.nameLabel': 'Nom',
    'map.common.deletePrefix': 'Supprimer',
    'map.common.backToCampaign': 'Campagne',
    'map.badge.prototype': 'Prototype — hors production',
    'map.tv.missingParams': 'URL invalide : il manque `cid` ou `mid`.',
    'map.tv.notFound': 'Carte introuvable.',
    'map.tv.back': 'Retour',
    'map.cloud.signedOut': 'Connexion requise pour gérer les cartes.',
    'map.cloud.title': 'Cartes',
    'map.cloud.campaignPrefix': 'Campagne : ',
    'map.cloud.importLink': 'Importer une carte .dd2vtt',
    'map.cloud.ensureErrorPrefix': 'Initialisation campagne : ',
    'map.cloud.createSection': 'Créer une carte',
    'map.cloud.newMap': 'Nouvelle carte',
    'map.cloud.slugPlaceholder': 'donjon-de-l-aube',
    'map.cloud.namePlaceholder': 'Donjon de l’Aube',
    'map.cloud.creating': 'Création…',
    'map.cloud.create': 'Créer',
    'map.cloud.loadErrorPrefix': 'Erreur de chargement : ',
    'map.cloud.loadingMaps': 'Chargement des cartes…',
    'map.cloud.empty': 'Aucune carte pour cette campagne. Créez-en une ci-dessus.',
    'map.cloud.emptyMember':
      "Le meneur n'a pas encore préparé de carte pour cette campagne.",
    'map.cloud.memberIntro':
      'Ces cartes sont en lecture seule : tu vois exactement ce que le meneur projette sur la table.',
    'map.zoom.inAria': 'Zoomer sur la carte',
    'map.zoom.outAria': 'Dézoomer la carte',
    'map.zoom.reset': 'Recadrer',
    'map.cloud.listAria': 'Liste des cartes',
    'map.cloud.delete': 'Suppr.',
    'map.import.signedOut': 'Connexion requise pour importer une carte.',
    'map.import.parseFailedPrefix': 'Lecture impossible : ',
    'map.import.back': 'Cartes',
    'map.import.title': 'Importer une carte',
    'map.import.badge': '.dd2vtt — Dungeon Alchemist',
    'map.import.introBefore': 'Sélectionnez un fichier ',
    'map.import.introAfter':
      ' exporté par Dungeon Alchemist. Les murs, lumières et la grille sont importés et synchronisés ; l’image de fond reste stockée localement sur cet appareil (la synchronisation multi-appareils arrivera avec Firebase Storage).',
    'map.import.chooseFile': 'Choisir un fichier .dd2vtt',
    'map.import.statDimensions': 'Dimensions',
    'map.import.statWalls': 'Murs',
    'map.import.statLights': 'Lumières',
    'map.import.statImage': 'Image',
    'map.import.squaresSuffix': 'cases',
    'map.import.verticesSuffix': 'sommets',
    'map.import.imageIncluded': 'Incluse',
    'map.import.imageAbsent': 'Absente',
    'map.import.preview': 'Aperçu',
    'map.import.saveSection': 'Enregistrer la carte',
    'map.import.submitting': 'Import…',
    'map.import.submit': 'Importer',
    // Écran carte — import d'une image nue (2ᵉ onglet de l'import)
    'map.import.tabDd2vtt': 'Fichier Dungeon Alchemist',
    'map.import.tabImage': 'Image de battlemap',
    'map.import.imageIntro':
      "Une image suffit : n'importe quel plan trouvé en ligne devient une carte jouable. Ni murs ni lumières ne sont déduits — le voile et la grille se règlent ensuite dans la carte.",
    'map.import.chooseImage': 'Choisir une image',
    'map.import.imageProcessing': 'Optimisation…',
    'map.import.imageTooLarge':
      "Cette image reste trop lourde après optimisation. Réduis-la avant de l'importer.",
    'map.import.imageFailed': "Cette image n'a pas pu être lue.",
    'map.import.statWeight': 'Poids optimisé',
    'map.import.statScale': 'Échelle de départ',
    'map.import.imageHint':
      "L'image reste sur cet appareil. Pour que la table la voie, renseigne une URL publique dans les réglages de la carte.",
    // Écran carte — réglages d'une carte existante (map-settings-modal)
    'map.settings.closeLabel': 'Fermer les réglages',
    'map.settings.title': 'Réglages de la carte',
    'map.settings.gridSizeLabel': "Taille d'une case à l'écran (pixels)",
    'map.settings.gridSizeHelp':
      "Ajuste cette valeur jusqu'à ce que la grille se pose sur celle de l'image.",
    'map.settings.scaleLabel': 'Une case représente (mètres)',
    'map.settings.scaleEchoPrefix': 'Enregistré comme ',
    'map.settings.scaleInvalid': 'Saisis une distance en mètres, par exemple 1,5.',
    'map.settings.imageUrlLabel': "URL de l'image de fond",
    'map.settings.imageUrlPlaceholder': 'https://…',
    'map.settings.imageUrlHelp':
      "Une image importée reste locale à cet appareil. Une URL publique, elle, s'affiche aussi chez les joueurs et sur l'écran de table.",
    'map.settings.save': 'Enregistrer les réglages',
    'map.live.settingsButton': 'Réglages',
    'map.tip.openSettings':
      "Renommer la carte, recaler la grille, changer l'échelle ou l'image de fond.",
    // Écran carte — édition de jeton (token-edit-modal) + bestiaire (monster-picker)
    'map.token.editTitle': 'Modifier le jeton',
    'map.token.closeLabel': 'Fermer l’édition du jeton',
    'map.token.portraitSection': 'Portrait',
    'map.token.portraitAltPrefix': 'Portrait de ',
    'map.token.portraitAltFallback': 'ce jeton',
    'map.token.imageProcessing': 'Traitement…',
    'map.token.imageReplace': 'Remplacer',
    'map.token.imageAdd': 'Ajouter une image',
    'map.token.imageRemove': 'Retirer l’image',
    'map.token.imageError': 'Échec du chargement de l’image.',
    'map.token.imageHelp':
      'Recadrée en rond et optimisée, puis synchronisée sur tous les écrans (vue TV, autres appareils).',
    'map.token.kindSection': 'Type de jeton',
    'map.token.colorSection': 'Couleur',
    'map.token.colorGroupAria': 'Couleur du jeton',
    'map.token.visionSection': 'Portée de vision',
    'map.token.visionGroupAria': 'Portée de vision du jeton',
    'map.token.visionNone': 'Aucune',
    'map.token.visionHelp':
      'Rayon de brouillard dissipé autour du jeton quand la ligne de vue est active.',
    'map.token.lightSection': 'Lumière portée',
    'map.token.lightGroupAria': 'Lumière portée par le jeton',
    'map.token.lightNoneSub': 'Ne porte rien',
    'map.token.lightRadiusPrefix': 'Rayon ',
    'map.token.lightHelp':
      'La lumière suit le jeton quand il se déplace (appliquée immédiatement).',
    'map.token.save': 'Enregistrer',
    'map.token.duplicate': 'Dupliquer le jeton',
    'map.token.delete': 'Supprimer ce jeton',
    'map.token.fallbackLabel': 'Créature',
    'map.token.colorBlue': 'Bleu',
    'map.token.colorRed': 'Rouge',
    'map.token.colorGreen': 'Vert',
    'map.token.colorAmber': 'Ambre',
    'map.token.colorPurple': 'Violet',
    'map.token.colorTurquoise': 'Turquoise',
    'map.token.colorPink': 'Rose',
    'map.token.colorGray': 'Gris',
    'map.token.kindPj': 'Personnage joueur',
    'map.token.kindPnj': 'PNJ / monstre',
    'map.token.kindMarker': 'Repère',
    'map.token.kindHintPj': 'Allié contrôlé par un joueur',
    'map.token.kindHintPnj': 'Créature contrôlée par le MJ',
    'map.token.kindHintMarker': 'Point d’intérêt, sans vision',
    'map.token.visionNoneSub': 'Sans ligne de vue',
    'map.token.visionNormalSub': 'Vision normale',
    'map.token.visionDarkSub': 'Vision dans le noir',
    'map.token.visionDarkExtSub': 'Vision dans le noir étendue',
    'map.token.lightNone': 'Aucune',
    'map.token.lightCandle': 'Bougie',
    'map.token.lightTorch': 'Torche',
    'map.token.lightLantern': 'Lanterne',
    'map.monsterPicker.title': 'Ajouter depuis le bestiaire',
    'map.monsterPicker.searchPlaceholder': 'Rechercher un monstre…',
    'map.monsterPicker.searchAria': 'Rechercher un monstre',
    'map.monsterPicker.loading': 'Chargement du bestiaire…',
    'map.monsterPicker.emptyTitle': 'Votre bestiaire est vide.',
    'map.monsterPicker.emptyHint':
      'Importez un pack d’extension (monstres) depuis Mon compte › Contenu, puis revenez ici : vos créatures seront posables d’un tap.',
    'map.monsterPicker.noMatchBefore': 'Aucun monstre ne correspond à « ',
    'map.monsterPicker.noMatchAfter': ' ».',
    'map.monsterPicker.crPrefix': 'FP',
    // Écran carte live (map-live-screen) — barre d'outils MJ
    'map.live.signedOut': 'Connexion requise pour gérer la carte.',
    'map.live.badge': 'Prototype — Firestore en direct',
    'map.live.metaTokenSingular': 'token',
    'map.live.metaTokenPlural': 'tokens',
    'map.live.writeErrorPrefix': 'Écriture refusée : ',
    'map.live.portraitTooHeavy':
      'Portrait trop lourd à synchroniser. Réessaie avec une image plus simple.',
    'map.live.fogLabel': 'Fog',
    'map.live.addFogReveal': 'Reveal au centre',
    'map.live.addFogMask': 'Mask au centre',
    'map.live.clearFog': 'Effacer fog',
    'map.live.lightsLabel': 'Lumières',
    'map.live.lightTooltipPrefix': 'Poser une lumière « ',
    'map.live.lightTooltipMid': ' » au centre (rayon ',
    'map.live.clearLights': 'Effacer lumières',
    'map.live.aoeLabel': 'AoE',
    'map.live.clearAoe': 'Effacer AoE',
    'map.live.deleteAoe': 'Supprimer',
    'map.live.tokensLabel': 'Tokens',
    'map.live.addPj': '+ PJ',
    'map.live.addPnj': '+ PNJ',
    'map.live.addBestiary': '+ Bestiaire',
    'map.live.clearTokens': 'Effacer tokens',
    'map.live.tokenAbbrevPj': 'PJ',
    'map.live.tokenAbbrevPnj': 'PNJ',
    'map.live.tokenAbbrevMarker': '•',
    'map.live.wallsLabel': 'Murs',
    'map.live.gridToggle': 'Grille :',
    'map.live.snapToggle': 'Aimant :',
    'map.live.fogToggleLabel': 'Voile :',
    'map.live.losToggle': 'Ligne de vue :',
    'map.live.playerViewToggle': 'Vue joueur :',
    'map.live.lightingToggle': 'Éclairage :',
    'map.live.tvView': 'Vue présentation',
    'map.live.measureLabel': 'Mesure',
    'map.live.measureToggle': 'Mesure :',
    'map.live.distancePrefix': 'Distance : ',
    'map.live.clearMeasure': 'Effacer mesure',
    'map.live.measureHint': 'Cliquez sur la carte pour poser les points.',
    'map.light.candle': 'Bougie',
    'map.light.torch': 'Torche',
    'map.light.spell': 'Sort Lumière',
    'map.light.lantern': 'Lanterne',
    'map.light.sunlight': 'Lumière du jour',
    'map.aoe.sphere': 'Sphère',
    'map.aoe.cone': 'Cône',
    'map.aoe.line': 'Ligne',
    'map.aoe.cube': 'Cube',
    // Prototype carte autonome (/map-proto) — FR conservé à l'identique
    // (anglicismes Fog/AoE/tokens/Seed/drag intacts, terminologie = Adrien).
    'map.proto.title': 'Prototype carte',
    'map.proto.importBg': 'Importer un fond',
    'map.proto.hideGrid': 'Masquer grille',
    'map.proto.showGrid': 'Afficher grille',
    'map.proto.reset': 'Réinitialiser',
    'map.proto.zoomLabel': 'zoom',
    'map.proto.fogSection': 'Fog of war',
    'map.proto.fogOn': 'Fog activé',
    'map.proto.fogOff': 'Fog désactivé',
    'map.proto.viewPlayer': 'Vue joueur',
    'map.proto.viewDm': 'Vue MJ',
    'map.proto.brushReveal': 'Pinceau révéler',
    'map.proto.brushMask': 'Pinceau gomme',
    'map.proto.revealAll': 'Tout révéler',
    'map.proto.maskAll': 'Tout remasquer',
    'map.proto.lightSection': 'Lumière',
    'map.proto.lightOn': 'Lumière activée',
    'map.proto.lightOff': 'Lumière désactivée',
    'map.proto.placeTorch': 'Placer torche',
    'map.proto.tokenTorchPrefix': 'Torche',
    'map.proto.clearLights': 'Effacer lumières',
    'map.proto.aoeSection': 'AoE',
    'map.proto.clearAoe': 'Effacer AoE',
    'map.proto.vttSection': 'VTT (prototype)',
    'map.proto.ruler': 'Règle',
    'map.proto.clearRuler': 'Effacer règle',
    'map.proto.gridSnap': 'Aimant grille',
    'map.proto.on': 'on',
    'map.proto.off': 'off',
    'map.proto.initiative': 'Initiative',
    'map.proto.intro':
      'Importez une image de fond, faites glisser les tokens à la souris (ou au doigt sur tactile), molette pour zoomer, drag sur le fond pour déplacer la vue.',
    'map.proto.fogIntroPrefix': ' Le brouillard est ',
    'map.proto.fogStateOpaque': 'opaque (vue joueur)',
    'map.proto.fogStateTranslucent': 'translucide (vue MJ)',
    'map.proto.fogIntroSuffix':
      ', les PJ révèlent automatiquement autour d’eux ; activez un pinceau pour peindre une zone manuellement.',
    'map.proto.noPersistStrong': 'Aucune persistance',
    'map.proto.noPersistRest': ' — un rafraîchissement réinitialise tout.',
    'map.proto.initSeed': 'Seed depuis tokens',
    'map.proto.initNextTurn': 'Tour suivant',
    'map.proto.initReset': 'Réinit',
    'map.proto.initEmpty': 'Aucune entrée. Cliquez « Seed depuis tokens » pour démarrer.',
    'map.proto.hp': 'PV',
    'map.proto.removeEntryPrefix': 'Retirer',
    // Infobulles explicites — assistant + montée de niveau (wizard / level-up)
    'wizard.tip.rollAbilities': 'Lance les dés à votre place pour générer les six valeurs.',
    'wizard.tip.autofillAbilities': 'Remplit les caractéristiques recommandées pour votre classe.',
    'wizard.tip.navPrevious': 'Revient à l’étape précédente.',
    'wizard.tip.navNext': 'Passe à l’étape suivante.',
    'wizard.tip.autofillSpells': 'Choisit pour vous des sorts adaptés à la classe.',
    'wizard.tip.recapEdit': 'Retourne à cette étape pour la modifier.',
    'wizard.tip.removeClass': 'Retire cette classe du personnage.',
    'wizard.tip.addClass': 'Ajoute une seconde classe au personnage.',
    'wizard.tip.autofillEquipment': 'Choisit pour vous un équipement de départ adapté.',
    'wizard.tip.autofillSkills': 'Choisit pour vous des compétences adaptées à la classe.',
    'levelUp.tip.levelUp': 'Fait gagner un niveau à votre classe principale.',
    'levelUp.tip.addClass': 'Apprend une nouvelle classe en multiclasse.',
    'levelUp.tip.hpAverage': 'Gain de points de vie fixe, sans hasard.',
    'levelUp.tip.hpRoll': 'Gain de points de vie aléatoire, lancé au dé.',
    'levelUp.button.levelUp': 'Monter de niveau',
    'levelUp.button.levelUpAria': 'Monter au niveau {level}',
    'levelUp.button.addClass': 'Ajouter une classe',
    'levelUp.button.addClassAria': 'Ajouter une classe en multiclasse',
    // Modale de montée de niveau / ajout de classe (multiclasse)
    'levelUp.mode.levelUp': 'Montée de niveau',
    'levelUp.mode.addClass': 'Ajouter une classe',
    'levelUp.heading.levelUp': '{class} — Niveau {from} → {to}',
    'levelUp.heading.addClassPrompt': 'Choisis ta nouvelle classe',
    'levelUp.heading.addClassTarget': '{class} — Niveau 1',
    'levelUp.stepIndicator.aria': 'Progression de la montée de niveau',
    'levelUp.stepIndicator.label': 'Étape {n} / {total}',
    'levelUp.empty': 'Aucun choix à faire — confirme la montée de niveau.',
    'levelUp.nav.previous': 'Précédent',
    'levelUp.nav.next': 'Suivant',
    'levelUp.nav.confirm': 'Confirmer',
    'levelUp.nav.applying': 'Application…',
    'levelUp.hp.title': 'Points de vie',
    'levelUp.hp.intro':
      "Choisis comment déterminer ton gain de PV pour ce niveau. La moyenne est l'option recommandée par défaut.",
    'levelUp.hp.average': 'Moyenne',
    'levelUp.hp.gain': '+{n} PV',
    'levelUp.hp.roll': 'Lancer le dé',
    'levelUp.hp.diePlusMod': '{die} + {mod}',
    'levelUp.subclass.title': 'Sous-classe',
    'levelUp.subclass.intro':
      "Choisis la voie spécialisée de ton {class}. Ce choix s'applique dès ce niveau.",
    'levelUp.subclass.loading': 'Chargement des sous-classes…',
    'levelUp.subclass.none': 'Aucune sous-classe disponible pour cette classe.',
    'levelUp.subclass.listAria': 'Sous-classes disponibles',
    'levelUp.asi.titleEpic': 'Amélioration de caractéristique ou don épique',
    'levelUp.asi.title': 'Amélioration de caractéristique ou don',
    'levelUp.asi.introEpic':
      'À ce niveau tu peux soit répartir 2 points de caractéristique (+2 sur une stat ou +1/+1 sur deux), soit prendre un don épique à la place.',
    'levelUp.asi.intro':
      'Tu peux soit répartir 2 points de caractéristique (+2 sur une stat ou +1/+1 sur deux), soit prendre un don général à la place.',
    'levelUp.asi.typeAria': 'Type de bonification',
    'levelUp.asi.improvement': 'Amélioration',
    'levelUp.asi.feat': 'Don',
    'levelUp.asi.distributionLegend': 'Mode de répartition',
    'levelUp.asi.plusTwo': '+2 sur une caractéristique',
    'levelUp.asi.plusOneOne': '+1 sur deux caractéristiques',
    'levelUp.asi.primary': 'Caractéristique principale',
    'levelUp.asi.secondary': 'Caractéristique secondaire',
    'levelUp.feat.epic': 'Don épique',
    'levelUp.feat.general': 'Don général',
    'levelUp.feat.loading': 'Chargement des dons…',
    'levelUp.feat.placeholder': 'Choisir un don…',
    'levelUp.feat.blockedTitle': 'Prérequis non rempli — {reasons}',
    'levelUp.prereq.level': 'Niveau {n}+ requis',
    'levelUp.prereq.ability': '{ability} {n}+ requis',
    'levelUp.prereq.spellcasting': 'Capacité à lancer un sort requise',
    'levelUp.prereq.classFeature': 'Aptitude de classe « {feature} » requise',
    'levelUp.pick.cantripsLabel': 'Sorts mineurs',
    'levelUp.pick.cantripsHelp': 'Choisis {count} sort(s) mineur(s) supplémentaire(s).',
    'levelUp.pick.spellsLabel': 'Sorts',
    'levelUp.pick.spellsHelp': 'Choisis {count} sort(s) supplémentaire(s) (niveau ≤ {maxLevel}).',
    'levelUp.pick.invocationsLabel': 'Manifestations occultes',
    'levelUp.pick.invocationsHelp':
      'Choisis {count} manifestation(s) occulte(s) supplémentaire(s).',
    'levelUp.pick.selectedCount': '{n} / {max} sélectionné(s)',
    'levelUp.pick.loading': 'Chargement…',
    'levelUp.pick.none': 'Aucune option disponible pour ce niveau.',
    'levelUp.addClass.ownedReason': 'Classe déjà possédée',
    'levelUp.addClass.pickTitle': 'Classe à ajouter',
    'levelUp.addClass.pickIntro':
      'Choisis la classe que ton personnage souhaite apprendre. Les classes grisées sont indisponibles — survole pour voir la raison.',
    'levelUp.addClass.blockedTitle': 'Indisponible — {reason}',
    'levelUp.addClass.selectFirst':
      "Sélectionne d'abord une classe à l'étape précédente.",
    'levelUp.addClass.defNotFound': 'Définition introuvable pour « {id} ».',
    'levelUp.addClass.subChoicesTitle': 'Sous-choix L1',
    'levelUp.addClass.noSubChoices':
      "{class} n'a aucun sous-choix imposé au niveau 1 — tu peux valider directement.",
    'levelUp.addClass.subChoicesTitleClass': 'Sous-choix L1 — {class}',
    'levelUp.addClass.subChoicesIntro':
      'Sélectionne les options de niveau 1 imposées par la classe.',
    'levelUp.addClass.divineOrder': 'Ordre divin',
    'levelUp.addClass.primalOrder': 'Ordre primordial',
    'levelUp.addClass.fightingStyle': 'Style de combat',
    'levelUp.addClass.weaponMasteryLegend': "Maîtrises d'armes ({count})",
    'levelUp.addClass.weaponMasteryHelper':
      'Sélectionne {count} armes éligibles à la maîtrise SRD 5.2.1.',
    'levelUp.addClass.weaponMasterySummary': 'Maîtrise · {property}',
    'levelUp.addClass.invocationLegend': 'Invocation occulte (1)',
    'levelUp.addClass.invocationHelper':
      'Choisis ton invocation occulte initiale. Pact of the Tome / Blade exposeront leurs sous-choix dans une prochaine itération.',
    'levelUp.addClass.spellbookLegend': 'Sorts du grimoire (6 sorts L1)',
    'levelUp.addClass.spellbookHelper':
      'Sélectionne 6 sorts L1 du Magicien à inscrire dans ton grimoire de départ.',
    'levelUp.addClass.spellSchoolSummary': 'École · {school}',
    'levelUp.addClass.upcomingBadge': 'À venir',
    'levelUp.addClass.upcomingBody':
      "les sous-choix conditionnels (Expertise du Roublard, Pact of the Tome / Blade de l'Occultiste) seront câblés dans une prochaine itération. Confirmer reste bloqué si tu sélectionnes une invocation de pact qui requiert ces sous-choix.",
    'levelUp.addClass.missingHint':
      'Encore {n} sous-choix à compléter avant de pouvoir confirmer.',
    // Infobulles explicites — menu radial, dés, journal, outils MJ
    'radialMenu.tip.fab': 'Ouvre le menu d’actions de la fiche.',
    'radialMenu.tip.back': 'Revient au menu précédent.',
    'radialMenu.tip.close': 'Ferme le menu.',
    'dice.tip.closeHistory': 'Ferme l’historique des jets.',
    'dice.history.title': 'Historique des jets',
    'dice.options.bonus': 'Bonus ponctuel',
    'dice.options.bonusAria': 'Bonus ponctuel appliqué à ce jet',
    'dice.options.useInspiration': 'Dépenser l’inspiration',
    'dice.options.inspirationNote':
      'L’inspiration impose l’avantage et sera dépensée.',
    'dice.options.title': 'Comment lancer',
    'dice.options.aria': 'Options du jet {label}',
    'dice.free.title': 'Jet libre',
    'dice.free.aria': 'Lancer une formule de dés libre',
    'dice.free.label': 'Formule',
    'dice.free.placeholder': '2d10+3',
    'dice.free.hint': 'Exemples : 4d6 · 2d10+3 · 1d20-1d4 · 2d20kh1',
    'dice.free.invalid': 'Formule illisible.',
    'dice.free.submit': 'Lancer',
    'dice.free.cancel': 'Annuler',
    'dice.free.rollLabel': 'Jet libre',
    'sheet.fab.freeRoll': 'Jet libre',
    // Modale de jet physique (le wording « Passer » est non négociable, plan 12.5)
    'dice.physical.header': 'Mode physique — saisis tes dés',
    'dice.physical.rollPrompt': 'Lance {dice}',
    'dice.physical.withAdvantage': ' · avec avantage',
    'dice.physical.withDisadvantage': ' · avec désavantage',
    'dice.physical.kept': 'Gardé',
    'dice.physical.faceAria': 'Face d{sides} numéro {n}',
    'dice.physical.total': 'Total',
    'dice.physical.crit': 'Réussite critique',
    'dice.physical.fumble': 'Échec critique',
    'dice.physical.passTip': 'Abandonne ce jet sans rien enregistrer.',
    'dice.physical.pass': 'Passer',
    'dice.physical.validateTip': 'Confirme les faces saisies et calcule le total.',
    'dice.physical.validate': 'Valider',
    'dice.hitMiss.eyebrow': 'Mode physique — résolution d’attaque',
    'dice.hitMiss.question': 'Ton total dépasse-t-il la CA de la cible ?',
    'dice.hitMiss.miss': 'Raté',
    'dice.hitMiss.hit': 'Touché',
    'dice.hitMiss.missTip': 'L’attaque rate : ton total n’atteint pas la cible.',
    'dice.hitMiss.hitTip': 'L’attaque touche : ton total atteint ou dépasse la cible.',
    'dice.history.closeLabel': 'Fermer l’historique',
    'dice.history.empty':
      'Aucun jet enregistré. Tente une initiative ou un test de caractéristique.',
    'dice.history.modeSaveError': 'Mode de dés non sauvegardé',
    'dice.history.modeSaveErrorSub': 'Erreur Firestore',
    'dm.tip.advNormal': 'Jet normal : un seul d20.',
    'dm.tip.advAdvantage': 'Avantage : lance deux d20, garde le plus haut.',
    'dm.tip.advDisadvantage': 'Désavantage : lance deux d20, garde le plus bas.',
    'dm.tip.secretRoll': 'Lance le d20 secret avec le modificateur.',
    'journal.tip.export': 'Télécharge le journal complet en fichier Markdown.',
    'journal.tip.exportSession':
      'Télécharge cette seule séance — de quoi la transmettre à un joueur absent.',
    'journal.tip.compile': 'Génère le récit de la séance à partir des événements.',
    'journal.tip.edit': 'Modifie le récit à la main.',
    'journal.tip.recompile': 'Régénère le récit depuis les événements.',
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
    'alignment.LB': 'Lawful Good',
    'alignment.NB': 'Neutral Good',
    'alignment.CB': 'Chaotic Good',
    'alignment.LN': 'Lawful Neutral',
    'alignment.N': 'Neutral',
    'alignment.CN': 'Chaotic Neutral',
    'alignment.LM': 'Lawful Evil',
    'alignment.NM': 'Neutral Evil',
    'alignment.CM': 'Chaotic Evil',
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
    // Codex — SRD content browser (plan 19)
    'codex.title': 'The Codex',
    'codex.subtitle': 'All SRD 5.2.1 content, at your fingertips.',
    'codex.overlay.subtitle': 'Look up a rule without leaving the game.',
    'codex.overlay.close': 'Close the Codex',
    'codex.nav.cta': 'The Codex',
    'codex.loading': 'Summoning content…',
    'codex.empty': 'No entry matches your search.',
    'codex.result.singular': 'result',
    'codex.result.plural': 'results',
    'codex.cat.aria': 'Codex categories',
    'codex.cat.search': 'Search',
    'codex.search.all': 'Search the whole Codex…',
    'codex.search.allHint':
      'Type at least two letters to search every category at once.',
    'codex.cat.spells': 'Spells',
    'codex.cat.feats': 'Feats',
    'codex.cat.invocations': 'Invocations',
    'codex.cat.conditions': 'Conditions',
    'codex.cat.magicItems': 'Magic Items',
    'codex.cat.items': 'Equipment',
    'codex.cat.monsters': 'Bestiary',
    'codex.search.monsters': 'Search a monster…',
    'codex.monster.allSizes': 'All sizes',
    'codex.monster.senses': 'Senses',
    'codex.cat.ancestries': 'Species',
    'codex.cat.backgrounds': 'Backgrounds',
    'codex.cat.classes': 'Classes',
    'codex.search.spells': 'Search a spell…',
    'codex.search.feats': 'Search a feat…',
    'codex.search.invocations': 'Search an invocation…',
    'codex.search.conditions': 'Search a condition…',
    'codex.search.magicItems': 'Search a magic item…',
    'codex.search.items': 'Search equipment…',
    'codex.search.ancestries': 'Search a species…',
    'codex.search.backgrounds': 'Search a background…',
    'codex.search.classes': 'Search a class…',
    'codex.detail.prerequisite': 'Prerequisite',
    'codex.detail.prereqLevel': 'Required level',
    'codex.spell.allLevels': 'All levels',
    'codex.spell.allSchools': 'All schools',
    'codex.spell.classesLabel': 'Available to',
    'codex.item.allRarities': 'All rarities',
    'codex.item.allCategories': 'All categories',
    'codex.item.weight': 'Weight',
    'codex.item.cost': 'Cost',
    'codex.item.damage': 'Damage',
    'codex.item.ac': 'Armor Class',
    'codex.item.properties': 'Properties',
    'codex.item.attunement': 'Attunement',
    'codex.item.attunementRequired': 'Requires attunement',
    'codex.species.size': 'Size',
    'codex.species.speed': 'Speed',
    'codex.species.asi': 'Ability Score Increase',
    'codex.common.languages': 'Languages',
    'codex.common.traits': 'Traits',
    'codex.bg.skills': 'Skill Proficiencies',
    'codex.bg.coins': 'Starting Coins',
    'codex.class.hitDie': 'Hit Die',
    'codex.class.primaryAbility': 'Primary Ability',
    'codex.class.savingThrows': 'Saving Throws',
    'codex.class.skills': 'Skills',
    'codex.class.chooseAmong': 'chosen from',
    'codex.class.features': 'Class Features',
    'size.tiny': 'Tiny',
    'size.small': 'Small',
    'size.medium': 'Medium',
    'size.large': 'Large',
    'size.huge': 'Huge',
    'size.gargantuan': 'Gargantuan',
    'account.title': 'My account',
    'account.subtitle': 'Profile and game preferences.',
    'account.profile.title': 'Profile',
    'account.profile.anonymous': 'Anonymous adventurer',
    'account.profile.anonymousHint':
      'Your data lives on this device. Link an account to find it elsewhere.',
    'account.profile.emailLabel': 'Email address',
    'account.profile.providerLabel': 'Sign-in',
    'account.provider.google': 'Google',
    'account.provider.password': 'Email / password',
    'account.provider.anonymous': 'Guest',
    'account.prefs.title': 'Preferences',
    'account.dice.title': 'Dice mode',
    'account.dice.hint':
      'How you roll: the app rolls for you, or you roll real dice and enter the result.',
    'account.dice.digital': 'Digital',
    'account.dice.digitalHint': 'The app rolls the dice for you.',
    'account.dice.physical': 'Physical',
    'account.dice.physicalHint': 'You roll your dice and enter the faces; the app computes.',
    'account.dice.followCampaign': 'Follow the campaign mode',
    'account.dice.followCampaignHint':
      'Automatically adopt the dice mode set by the DM.',
    'account.locale.title': 'Language',
    'account.locale.hint': 'Choose the interface and content language.',
    'account.locale.fr': 'French',
    'account.locale.en': 'English',
    'account.content.title': 'Custom content',
    'account.content.hint':
      'Import content packs (spells, classes, items, monsters…) or author your own to use them in play.',
    'account.content.cta': 'Manage my packs',
    'account.signOut': 'Sign out',
    'account.signOutConfirm': 'Confirm sign-out',
    'account.cancel': 'Cancel',
    'auth.nudge.title': 'Save your account',
    'auth.nudge.body':
      'Your account is temporary. Link it to Google or an email so you don’t lose your characters or campaigns if you switch devices.',
    'auth.nudge.cta': 'Secure my account',
    'account.link.title': 'Save your account',
    'account.link.hint':
      'You are playing as a guest: your characters and campaigns live only on this device. Link an account to find them elsewhere and lose nothing.',
    'account.link.google': 'Continue with Google',
    'account.link.or': 'or',
    'account.link.emailLabel': 'Email address',
    'account.link.emailPlaceholder': 'you@example.com',
    'account.link.passwordLabel': 'Password',
    'account.link.passwordPlaceholder': '6 characters minimum',
    'account.link.emailCta': 'Link with email',
    'account.link.linking': 'Linking…',
    'account.link.success': 'Account linked. Your data is now saved.',
    'account.link.error.emailInUse':
      'This email is already used by another account.',
    'account.link.error.credentialInUse':
      'This account is already linked to another profile.',
    'account.link.error.weakPassword':
      'Password must be at least 6 characters.',
    'account.link.error.invalidEmail': 'Invalid email address.',
    'account.link.error.popupClosed':
      'The Google window closed before finishing. Try again.',
    'account.link.error.generic': 'Linking failed. Try again.',
    'home.hub.title': 'Explore',
    'home.ongoing.label': 'In progress',
    'home.ongoing.kindEncounter': 'Combat',
    'home.ongoing.kindSession': 'Session',
    'home.ongoing.round': 'Round {n}',
    'home.ongoing.sessionNumber': 'Session {n}',
    'home.ongoing.cta': 'Resume',
    'home.draft.label': 'Creation started',
    'home.draft.unnamed': 'Unnamed hero',
    'home.draft.step': 'Step {n} of {total} · {step}',
    'home.draft.resume': 'Continue',
    'home.draft.resumeAria': 'Continue the creation of',
    'home.draft.discard': 'Discard',
    'home.draft.discardAria': 'Discard the draft of',
    'home.hub.codex.sub': 'Spells, items, species, classes…',
    'home.hub.campaigns.sub': 'Join or create a table.',
    'wizard.title': 'Create a character',
    'wizard.campaignLink.banner':
      'When you finish, this character will automatically join your campaign.',
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
    'wizard.label.droppedDie': 'dropped die',
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
    'spell.metaShort.castingTime': 'Cast.',
    'spell.metaShort.components': 'Comp.',
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
    'sheet.campaignLink': 'My campaign',
    'sheet.turnBanner.label': 'Your turn',
    'sheet.turnBanner.sub': 'Round {n} · {name}',
    'sheet.turnBanner.aria': 'Join the ongoing combat, it is your turn',
    'sheet.error.title': 'Loading error',
    'sheet.statusStrip.aria': 'Vital statistics',
    'sheet.modeTabs.aria': 'Sheet sections',
    'sheet.hero.level': 'Level {n}',
    'sheet.stat.hp': 'HP',
    'sheet.stat.ac': 'AC',
    'sheet.stat.init': 'Init',
    'sheet.stat.speed': 'Spd',
    'sheet.stat.editInit': 'Edit initiative',
    'sheet.stat.editSpeed': 'Edit speed (in meters)',
    'sheet.stat.passivePerception': 'Pass. perc.',
    'sheet.combat.hitDice.title': 'Hit Dice',
    'sheet.combat.hitDice.spend': 'Short rest',
    'sheet.combat.hitDice.spending': '…',
    'sheet.combat.hitDice.spendLabel': 'Spend a hit die ({class})',
    'sheet.combat.hitDice.restToast': 'Short rest',
    'sheet.combat.longRest.button': 'Long rest',
    'sheet.combat.longRest.confirm': 'Confirm long rest?',
    'sheet.combat.longRest.toastTitle': 'Long rest',
    'sheet.combat.longRest.grittyNote': 'Gritty realism: a long rest takes 7 days.',
    'sheet.combat.longRest.slowHealingNote':
      'Slow natural healing: spend hit dice to recover HP.',
    'sheet.combat.longRest.hpPart': '+{n} HP',
    'sheet.combat.longRest.hitDicePart': '+{n} hit dice',
    'sheet.combat.longRest.exhaustionPart': '−1 exhaustion',
    'sheet.combat.rest.resourcesPart': '{n} resources',
    'sheet.combat.shortRest.button': 'Short rest',
    'sheet.combat.shortRest.confirm': 'Confirm short rest?',
    'sheet.combat.shortRest.toastTitle': 'Short rest',
    'sheet.combat.shortRest.toastNone': 'Nothing to recharge right now.',
    'sheet.combat.shortRest.hint':
      'Recharges short-rest abilities. Spend hit dice above to recover HP.',
    'sheet.combat.shortRest.pactNote': 'Pact slots recharged.',
    'sheet.combat.shortRest.grittyNote': 'Gritty realism: a short rest takes 8 hours.',
    'sheet.combat.resources.title': 'Class resources',
    'sheet.combat.resources.spend': 'Spend',
    'sheet.combat.resources.restore': 'Restore',
    'sheet.combat.resources.spendLabel': 'Spend one {resource}',
    'sheet.combat.resources.restoreLabel': 'Restore one {resource}',
    'sheet.combat.resources.editMaxLabel': 'Edit the maximum for {resource}',
    'sheet.combat.resources.restoresShort': 'Short rest',
    'sheet.combat.resources.restoresLong': 'Long rest',
    'sheet.combat.resources.rage': 'Rage',
    'sheet.combat.resources.secondWind': 'Second Wind',
    'sheet.combat.resources.actionSurge': 'Action Surge',
    'sheet.combat.resources.channelDivinity': 'Channel Divinity',
    'sheet.combat.resources.layOnHands': 'Lay on Hands',
    'sheet.combat.resources.wildShape': 'Wild Shape',
    'sheet.combat.resources.sorceryPoints': 'Sorcery Points',
    'sheet.combat.resources.focusPoints': 'Focus Points',
    'sheet.combat.exhaustion.title': 'Exhaustion',
    'sheet.combat.exhaustion.none': 'No exhaustion',
    'sheet.combat.exhaustion.level': 'Level {n}',
    'sheet.combat.exhaustion.penalty': 'D20 Tests −{d20} · Speed −{speed} ft',
    'sheet.combat.exhaustion.death': 'Level 6: death.',
    'sheet.combat.exhaustion.decrease': 'Decrease exhaustion',
    'sheet.combat.exhaustion.increase': 'Increase exhaustion',
    'sheet.combat.exhaustion.readRule': 'Read the rule',
    'sheet.combat.condition.remove': 'Remove this condition',
    'sheet.combat.concentration.title': 'Concentration',
    'sheet.combat.concentration.cantrip': 'Cantrip',
    'sheet.combat.concentration.castAt': 'Cast at level {n}',
    'sheet.combat.concentration.damageRule':
      'On taking damage: Constitution saving throw, DC 10 or half the damage taken (whichever is higher).',
    'sheet.combat.concentration.break': 'Break concentration',
    'sheet.combat.concentration.rollSave': 'Constitution save',
    'sheet.combat.concentration.broken': 'Concentration ended',
    'sheet.combat.concentration.unknownSpell': 'Active spell',
    'sheet.combat.concentration.checkBig': 'DC {dc}',
    'sheet.combat.concentration.checkSub': 'Constitution saving throw to maintain it.',
    'sheet.combat.concentration.lostUnconscious': 'Concentration ended · unconscious',
    // Combat mode — cards, toasts and a11y labels
    'sheet.combat.uses': 'Uses',
    'sheet.combat.perLongRest': 'Per long rest',
    'sheet.combat.death.rollLabel': 'Death save',
    'sheet.combat.death.revivedTitle': 'Miraculous revival!',
    'sheet.combat.death.revivedSub': '{name} rises at 1 HP',
    'sheet.combat.death.stabilizedTitle': 'Stabilized',
    'sheet.combat.death.stabilizedSub': '{name} stays at 0 HP but does not die',
    'sheet.combat.death.deadTitle': 'Death confirmed',
    'sheet.combat.death.deadSub': '{name} fades away',
    'sheet.combat.death.twoFails': '+2 failures',
    'sheet.combat.death.oneSuccess': '+1 success',
    'sheet.combat.death.oneFail': '+1 failure',
    'sheet.combat.death.reviveTitle': 'Resurrected!',
    'sheet.combat.death.reviveSub': '{name} comes back to life',
    'sheet.combat.death.headingDead': '✦ Dead ✦',
    'sheet.combat.death.headingDying': '✦ Dying ✦',
    'sheet.combat.death.proseDead': '{name} has succumbed. Only resurrection can bring them back.',
    'sheet.combat.death.proseDying':
      '{name} fights against the end. Attempt three death saving throws.',
    'sheet.combat.death.successes': 'Successes',
    'sheet.combat.death.failures': 'Failures',
    'sheet.combat.death.rollButton': 'Roll a saving throw',
    'sheet.combat.death.reviveButton': '✦ Resurrect ✦',
    'sheet.combat.death.dmOnlyRevive': 'Only the GM can attempt resurrection.',
    'sheet.combat.hp.cardTitle': 'Vitality',
    'sheet.combat.hp.damageTakenTitle': 'Damage taken',
    'sheet.combat.hp.fraction': '{current}/{max} HP',
    'sheet.combat.hp.massiveDeathTitle': 'Instant death',
    'sheet.combat.hp.massiveDeathSub': 'Massive damage — no death save',
    'sheet.combat.hp.healTitle': 'Healing',
    'sheet.combat.hp.tempTitle': 'Temporary HP',
    'sheet.combat.hp.tempBuffer': 'Buffer before HP',
    'sheet.combat.hp.tempRemoved': 'Temporary HP removed',
    'sheet.combat.hp.tempEdit': 'Edit temporary HP ({n} currently)',
    'sheet.combat.hp.tempShort': 'Temp HP',
    'sheet.combat.hp.tempAdd': '+ Temp HP',
    'sheet.combat.hp.liveLabel': '{current} of {max} hit points, status {band}',
    'sheet.combat.hp.controlsHint': 'Tap = ±1 · Long press = number pad',
    'sheet.combat.hp.band.healthy': 'Healthy',
    'sheet.combat.hp.band.wounded': 'Wounded',
    'sheet.combat.hp.band.critical': 'Critical',
    'sheet.combat.hp.band.dead': 'Unconscious',
    'sheet.combat.numberpad.title.damage': 'Damage',
    'sheet.combat.numberpad.title.heal': 'Heal',
    'sheet.combat.numberpad.title.temp': 'Temporary HP',
    'sheet.combat.numberpad.title.max': 'Maximum HP',
    'sheet.combat.numberpad.commit.damage': 'Apply',
    'sheet.combat.numberpad.commit.heal': 'Heal',
    'sheet.combat.numberpad.commit.temp': 'Set',
    'sheet.combat.numberpad.commit.max': 'Set',
    'sheet.combat.hp.maxEdit': 'Change maximum HP (currently {n})',
    'sheet.combat.numberpad.cancel': 'Cancel',
    'sheet.combat.numberpad.full': 'Full ({max})',
    'sheet.combat.attacks.cardTitle': 'Attacks',
    'sheet.combat.attacks.emptyPre': 'No weapon equipped. Go to ',
    'sheet.combat.attacks.emptyPost': ' to equip a weapon.',
    'sheet.combat.attacks.ranged': 'Ranged',
    'sheet.combat.attacks.melee': 'Melee',
    'sheet.combat.attacks.menuAdvantage': 'Advantage',
    'sheet.combat.attacks.menuDisadvantage': 'Disadv.',
    'sheet.combat.attacks.menuCrit': 'Crit',
    'sheet.combat.hud.action': 'Action',
    'sheet.combat.hud.bonus': 'Bonus',
    'sheet.combat.hud.reaction': 'Reaction',
    'sheet.combat.hud.endTurnTitle': 'End of turn',
    'sheet.combat.hud.endTurnSub': 'Action economy reset',
    'sheet.combat.hud.inspirationTitle': 'Heroic inspiration',
    'sheet.combat.hud.inspirationGranted': 'Granted — reroll any test of your choice.',
    'sheet.combat.hud.inspirationRemoved': 'Removed.',
    'sheet.combat.hud.initiativeLabel': 'Initiative',
    'sheet.combat.hud.initShort': 'Init.',
    'sheet.combat.hud.inspirationGrantAria': 'Grant Heroic Inspiration',
    'sheet.combat.hud.inspirationRemoveAria': 'Remove Heroic Inspiration',
    'sheet.combat.hud.inspirationButton': 'Inspiration',
    'sheet.combat.hud.endTurnButton': 'End turn',
    'sheet.combat.breath.cardTitle': 'Draconic breath',
    'sheet.combat.breath.regionLabel': 'Draconic breath of the {dragon} dragon',
    'sheet.combat.breath.dragonLabel': 'Dragon {dragon}',
    'sheet.combat.breath.shape': 'Cone of 4.5 m or Line of 9 m × 1.5 m',
    'sheet.combat.breath.statDamage': 'Damage',
    'sheet.combat.breath.statDc': 'Dexterity DC',
    'sheet.combat.breath.statResist': 'Resistance',
    'sheet.combat.breath.cadence': 'Attack action · per long rest',
    'sheet.combat.breath.spendLabel': 'Spend a use of Draconic Breath ({dragon} dragon)',
    'sheet.combat.breath.restoreLabel': 'Restore a use of Draconic Breath ({dragon} dragon)',
    'sheet.combat.conditions.cardTitle': 'Conditions',
    'sheet.combat.conditions.removed': 'Condition removed',
    'sheet.combat.conditions.applied': 'Condition applied',
    'sheet.combat.conditions.detailAria': 'View details of the {name} condition',
    'sheet.combat.conditions.none': 'No active condition.',
    'sheet.combat.conditions.add': '+ Condition',
    'sheet.combat.conditions.searchPlaceholder': 'Search for a condition…',
    'sheet.combat.conditions.noMatch': 'No matching condition.',
    'sheet.combat.fightingStyle.cardTitle': 'Fighting style',
    'sheet.combat.fightingStyle.regionLabel': 'Fighting style: {name}',
    'sheet.combat.giant.cardTitle': 'Giant ancestry',
    'sheet.combat.giant.regionLabel': 'Giant Ancestry trait: {name}',
    'sheet.combat.giant.spendLabel': 'Spend a use of Giant Ancestry ({name})',
    'sheet.combat.giant.restoreLabel': 'Restore a use of Giant Ancestry ({name})',
    'sheet.combat.party.cardTitle': 'Companions',
    'sheet.combat.party.comingSoon':
      'Companion list available once campaign sync arrives (plan 16).',
    'sheet.combat.party.noCampaign':
      'No campaign joined. Join or create a campaign to see your companions.',
    'sheet.combat.slots.cardTitle': 'Spell slots',
    'sheet.combat.slots.toastTitle': 'Level {n} slot',
    'sheet.combat.slots.levelShort': 'Lvl {n}',
    'sheet.combat.slots.dotConsume': 'Use a slot (long press to restore)',
    'sheet.combat.slots.dotConsumed': 'Slot used (long press to restore)',
    'sheet.essence.languages.title': 'Languages',
    'sheet.essence.proficiencies.title': 'Proficiencies',
    'sheet.essence.proficiencies.armor': 'Armor',
    'sheet.essence.proficiencies.weapons': 'Weapons',
    'sheet.essence.proficiencies.tools': 'Tools',
    'sheet.essence.originFeat.title': 'Origin Feat',
    'sheet.essence.originFeat.openLabel': 'Origin Feat: {name}',
    'sheet.essence.ancestryTraits.title': 'Ancestry traits',
    'sheet.essence.ancestryTraits.openLabel': 'Trait: {name}',
    'sheet.essence.classFeatures.title': 'Class features',
    'sheet.essence.classFeatures.openLabel': 'Feature: {name}',
    'sheet.essence.classFeatures.level': 'Lv. {level}',
    'sheet.mode.combat': 'Combat',
    'sheet.mode.essence': 'Essence',
    'sheet.mode.magie': 'Magic',
    'sheet.mode.avoir': 'Inv.',
    'sheet.mode.ame': 'Soul',
    'combat.hud.tip.action': 'Mark your action as used this turn (tap again to undo).',
    'combat.hud.tip.bonus': 'Mark your bonus action as used this turn (tap again to undo).',
    'combat.hud.tip.reaction': 'Mark your reaction as used this turn (tap again to undo).',
    'combat.hud.tip.initiative': 'Roll your initiative to determine your place in combat order.',
    'combat.hud.label': 'Combat dashboard',
    'combat.hud.rollInitiative': 'Roll initiative',
    'combat.hp.tempTip': 'Add temporary HP (a buffer in front of your HP)',
    'combat.hp.tempLabel': 'Add temporary HP',
    'combat.hp.damageTip': 'Take 1 damage — long-press to enter an amount',
    'combat.hp.damageLabel': 'Take 1 damage (long-press to enter an amount)',
    'combat.hp.healTip': 'Heal 1 HP — long-press to enter an amount',
    'combat.hp.healLabel': 'Heal 1 HP (long-press to enter an amount)',
    'combat.hud.tip.inspirationGrant':
      'Grant Heroic Inspiration: you can spend it to reroll a check.',
    'combat.hud.tip.inspirationRemove': 'Remove Heroic Inspiration.',
    'combat.hud.tip.endTurn': 'End your turn and reset your action economy.',
    'sheet.fab.openLabel': 'Open action menu',
    'sheet.fab.closeLabel': 'Close menu',
    'sheet.fab.menuAria': 'Action menu',
    'sheet.fab.back': 'Back',
    'sheet.fab.allerA': 'Go to',
    'sheet.fab.sorts': 'Spells',
    'sheet.fab.outils': 'Tools',
    'sheet.fab.lancer': 'Roll',
    'sheet.fab.codex': 'Codex',
    'sheet.fab.repos': 'Rest',
    'sheet.fab.inspiration': 'Heroic Inspiration',
    'sheet.fab.inspirationOn': 'Granted — reroll any check.',
    'sheet.fab.inspirationOff': 'Removed.',
    'sheet.fab.historique': 'Roll history',
    'sheet.fab.d20Label': 'Quick d20',
    'sheet.placeholder.todo': 'Section coming in a later plan.',
    'sheet.ame.personality.title': 'Personality',
    'sheet.ame.personality.empty': 'Not filled in yet.',
    'sheet.ame.personality.edit': 'Edit',
    'sheet.ame.personality.save': 'Save',
    'sheet.ame.personality.cancel': 'Cancel',
    'sheet.ame.personality.editLabel': 'Edit {field}',
    'sheet.ame.personality.placeholder.trait':
      'E.g. “I always have a proverb ready for the occasion.”',
    'sheet.ame.personality.placeholder.ideal':
      'E.g. “Freedom. Chains are meant to be broken.”',
    'sheet.ame.personality.placeholder.bond':
      'E.g. “I would give my life for those of my old refuge.”',
    'sheet.ame.personality.placeholder.flaw':
      'E.g. “I can never resist a poorly guarded treasure.”',
    'sheet.ame.backstory.title': 'Backstory',
    'sheet.ame.backstory.empty': 'No backstory written yet.',
    'sheet.ame.backstory.placeholder':
      'Tell your character’s past: their origins, what drove them to adventure…',
    'sheet.ame.stats.title': 'Statistics',
    'sheet.ame.stats.totalRolls': 'Rolls made',
    'sheet.ame.stats.avgD20': 'Average d20',
    'sheet.ame.stats.crits': 'Critical hits',
    'sheet.ame.stats.fumbles': 'Critical misses',
    'sheet.ame.stats.topSkill': 'Favourite skill',
    'sheet.ame.stats.noRolls': 'No rolls recorded yet.',
    'sheet.magie.ancestry.tieflingTitle': 'Fiendish legacy spells',
    'sheet.magie.ancestry.elfTitle': 'Elven lineage spells',
    'sheet.magie.ancestry.gnomeTitle': 'Gnomish lineage spells',
    'sheet.magie.ancestry.genericTitle': 'Ancestry spells',
    'sheet.magie.ancestry.tieflingCommonSource': 'Otherworldly Presence',
    'sheet.magie.ancestryUsesLabel': 'Uses',
    'sheet.magie.ancestryPerLongRest': 'per long rest',
    'sheet.magie.ancestryNoUsesLeft': 'No uses left until a long rest.',
    'sheet.magie.ancestryLockedUntilLevel': 'Available at level',
    'sheet.magie.pactTome.sourceLabel': 'Pact of the Tome',
    'sheet.magie.prep.titleFor': 'Preparation · {class}',
    'sheet.magie.prep.count': '{n} / {cap} prepared',
    'sheet.magie.prep.edit': 'Edit',
    'sheet.magie.prep.done': 'Done',
    'sheet.magie.prep.hint':
      'Choose your prepared spells from your class list. Cantrips are always available.',
    'sheet.magie.prep.hintWizard':
      'Prepare your spells from your spellbook. Cantrips are always available.',
    'sheet.magie.prep.levelLabel': 'Level {n}',
    'sheet.magie.prep.prepared': 'Prepared',
    'sheet.magie.prep.alwaysAvailable': 'Always',
    'sheet.magie.prep.emptyPrepared': 'No spells prepared yet.',
    'sheet.magie.noMagic':
      'This character practises no arcane art — no spellcasting class.',
    // Magic mode — cards, circle/pact, list, spell modal
    'sheet.magie.restore': 'Restore',
    'sheet.magie.noSlotToConsume': 'No slot left to use',
    'sheet.magie.longPressRestore': 'Long press to restore',
    'sheet.magie.cantripLabel': 'Cantrip',
    'sheet.magie.cantripsHeading': 'Cantrips',
    'sheet.magie.slotLevelShort': 'Lvl {n}',
    'sheet.magie.concentrationShort': 'Conc.',
    'sheet.magie.ritualShort': 'Ritual',
    'sheet.magie.searchPlaceholder': 'Search for a spell…',
    'sheet.magie.searchLabel': 'Search for a spell',
    'sheet.magie.spellbookTitle': 'Spellbook',
    'sheet.magie.filterAll': 'All',
    'sheet.magie.filterPrepared': 'Prepared',
    'sheet.magie.filterCantrips': 'Cantrips',
    'sheet.magie.filterRituals': 'Rituals',
    'sheet.magie.noSpellMatch': 'No spell matches these filters.',
    'sheet.magie.preparedHeading': 'Prepared spells · {n}',
    'sheet.magie.grimoireHeading': 'Spellbook · {n}',
    'sheet.magie.grimoireAllPrepared': 'All your inscribed spells are prepared today.',
    'sheet.magie.pact.title': 'Pact magic',
    'sheet.magie.pact.consumed': 'Pact slot used',
    'sheet.magie.pact.restored': 'Pact slot restored',
    'sheet.magie.pact.shortRestTitle': 'Short rest simulated',
    'sheet.magie.pact.shortRestSub': 'Pact slots restored',
    'sheet.magie.pact.slotsInfo': 'Level {n} slots · restored on a short rest.',
    'sheet.magie.pact.dotConsume': 'Use a pact slot of level {n} (long press to restore)',
    'sheet.magie.pact.dotRestore': 'Restore a pact slot of level {n} (long press)',
    'sheet.magie.circle.title': 'Summoning circle',
    'sheet.magie.circle.noneUnlocked': 'No spell slot unlocked yet.',
    'sheet.magie.circle.slotConsumed': 'Level {n} slot used',
    'sheet.magie.circle.slotRestored': 'Level {n} slot restored',
    'sheet.magie.circle.longRestTitle': 'Long rest simulated',
    'sheet.magie.circle.longRestSub': 'All slots restored',
    'sheet.magie.circle.centerLabel': 'Circle',
    'sheet.magie.circle.rings': 'rings',
    'sheet.magie.circle.dotConsume': 'Use a level {n} slot (long press to restore)',
    'sheet.magie.circle.dotRestore': 'Restore a level {n} slot (long press)',
    'sheet.magie.detail.noCasterTitle': 'No casting class',
    'sheet.magie.detail.noCasterSub': 'The spell cannot be cast.',
    'sheet.magie.detail.noSlotTitle': 'No slot left',
    'sheet.magie.detail.noSlotSub': 'No level {n} slot available.',
    'sheet.magie.detail.concBrokenTitle': 'Concentration broken',
    'sheet.magie.detail.concBrokenSub': 'The previous spell ends.',
    'sheet.magie.detail.castLevelSuffix': ' · lvl {n}',
    'sheet.magie.detail.castBigCantrip': 'Cantrip',
    'sheet.magie.detail.castDcHint': 'DC {dc} if a save is required',
    'sheet.magie.detail.castDone': 'Cast',
    'sheet.magie.detail.concSuffix': ' · Concentration',
    'sheet.magie.detail.ritualSuffix': ' · Ritual',
    'sheet.magie.detail.atHigherLevels': 'At higher levels',
    'sheet.magie.detail.castingClass': 'Casting class',
    'sheet.magie.detail.classOption': '{name} (lvl {n})',
    'sheet.magie.detail.slotSection': 'Spell slot',
    'sheet.magie.detail.noSlotAvailable': 'No spell slot of level {n} or higher available.',
    'sheet.magie.detail.close': 'Close',
    'sheet.magie.detail.attackShort': 'Atk roll',
    'sheet.magie.detail.attackLabel': 'Attack · {spell}',
    'sheet.magie.detail.cast': 'Cast',
    'sheet.magie.detail.damageTitle': 'Damage',
    'sheet.magie.detail.damageBasePreview':
      'Base at level {level}: {formula} ({perLevel} per higher level)',
    'sheet.magie.detail.damageCantripPreview':
      'Cantrip scaling: {base} → {t5} (lvl 5) → {t11} (lvl 11) → {t17} (lvl 17)',
    'sheet.magie.stats.classLevelShort': 'Lvl {n}',
    'sheet.magie.stats.abilityLabel': 'Ability',
    'sheet.magie.stats.dcLabel': 'DC',
    'sheet.magie.stats.attackLabel': '+ attack',
    'sheet.magie.stats.preparedLabel': 'Preparation:',
    'sheet.magie.stats.preparedValue': '{n} spells',
    'sheet.magie.summon.cardLabel': 'Profile of {name}',
    'sheet.magie.summon.heading': 'Summoned creature profile',
    'sheet.magie.summon.ac': 'Armor class',
    'sheet.magie.summon.hp': 'Hit points',
    'sheet.magie.summon.speed': 'Speed',
    'sheet.magie.summon.senses': 'Senses',
    'sheet.magie.summon.languages': 'Languages',
    'sheet.magie.summon.challenge': 'Challenge',
    'sheet.magie.summon.resistances': 'Resistances',
    'sheet.magie.summon.immunities': 'Immunities',
    'sheet.magie.summon.traits': 'Traits',
    'sheet.magie.summon.actions': 'Actions',
    'sheet.magie.summon.bonusActions': 'Bonus actions',
    'sheet.magie.summon.reactions': 'Reactions',
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
    // Ability abbreviations (saving-throw chips)
    'ability.short.for': 'STR',
    'ability.short.dex': 'DEX',
    'ability.short.con': 'CON',
    'ability.short.int': 'INT',
    'ability.short.sag': 'WIS',
    'ability.short.cha': 'CHA',
    // Essence mode — orders, header, saves, skills, hexagram
    'sheet.essence.advantage': 'Advantage',
    'sheet.essence.normal': 'Normal',
    'sheet.essence.disadvantage': 'Disadvantage',
    'sheet.essence.close': 'Close',
    'sheet.essence.divineOrder.title': 'Divine order',
    'sheet.essence.divineOrder.aria': 'Divine order: {name}',
    'sheet.essence.primalOrder.title': 'Primal order',
    'sheet.essence.primalOrder.aria': 'Primal order: {name}',
    'sheet.essence.header.aura': 'Aura',
    'sheet.essence.header.inspirationChip': 'Inspiration',
    'sheet.essence.header.inspirationGranted': 'Inspiration granted',
    'sheet.essence.header.inspirationRemoved': 'Inspiration removed',
    'sheet.essence.header.inspirationGrantedSub': 'Next d20 with advantage',
    'sheet.essence.header.grantInspirationAria': 'Grant inspiration',
    'sheet.essence.header.removeInspirationAria': 'Remove inspiration',
    'sheet.essence.header.exhaustion': 'Exhaustion · level {n}',
    'sheet.essence.header.exhaustionPenalty': '−{n} on all d20 rolls.',
    'sheet.essence.invocations.title': 'Eldritch invocations',
    'sheet.essence.invocations.kind': 'Eldritch invocation',
    'sheet.essence.invocations.aria': 'Eldritch invocation: {name}',
    'sheet.essence.saves.title': 'Saving throws',
    'sheet.essence.saves.rollLabel': 'Save {ability}',
    'sheet.essence.saves.menuTitle': 'Save {ability}',
    'sheet.essence.saves.chipAria': 'Saving throw {ability}',
    'sheet.essence.saves.proficientSuffix': ' (proficient)',
    'sheet.essence.saves.menuAria': 'Options for the {ability} saving throw',
    'sheet.essence.skills.title': 'Skills',
    'sheet.essence.skills.searchPlaceholder': 'What do you want to do?',
    'sheet.essence.skills.noMatch': 'No matching skill.',
    'sheet.essence.skills.notProficient': 'Not proficient',
    'sheet.essence.skills.proficient': 'Proficient',
    'sheet.essence.skills.expertise': 'Expertise',
    'sheet.essence.hex.title': 'Hexagram',
    'sheet.essence.hex.proficiency': 'Proficiency',
    'sheet.essence.hex.rollLabel': 'Test of {ability}',
    'sheet.essence.hex.pointAria': 'Test of {ability} (long press for advantage/disadvantage)',
    'sheet.essence.hex.closeMenu': 'Close menu',
    'sheet.essence.hex.short.int': 'Int.',
    'sheet.essence.hex.short.sag': 'Wisdom',
    'sheet.essence.hex.short.cha': 'Charisma',
    'sheet.essence.hex.short.for': 'Strength',
    'sheet.essence.hex.short.con': 'Con.',
    'sheet.essence.hex.short.dex': 'Dex.',
    'sheet.combat.attacks.masteryBadgePrefix': 'Mastery',
    'sheet.combat.attacks.masteryBadgeAria': 'View {weapon} mastery',
    'nav.aria': 'Main navigation',
    'nav.brand.aria': 'Back to home',
    'nav.back': 'Back',
    'nav.back.aria': 'Back to library',
    'nav.back.campaigns': 'Back to my campaigns',
    'nav.back.account': 'Back to account',
    'nav.back.content': 'Back to my content',
    'nav.back.maps': 'Back to maps',
    'nav.avatar.aria': 'Account (coming soon)',
    'sheet.turnOptions.title': 'Outside your action',
    'sheet.turnOptions.hint': "What doesn't cost your action, and gets forgotten all campaign long.",
    'sheet.turnOptions.bonus': 'Bonus Action',
    'sheet.turnOptions.bonus.empty': 'No known Bonus Action spell.',
    'sheet.turnOptions.reaction': 'Reaction',
    'sheet.turnOptions.opportunityAttack': 'Opportunity Attack',
    'library.loading': 'Loading your characters',
    'sheet.switcher.open': 'Switch character',
    'sheet.switcher.title': 'Switch character',
    'sheet.switcher.hint': 'Open another of your sheets without going back to the library.',
    'sheet.switcher.level': 'Level',
    'account.dice3d.title': 'Three-dimensional dice',
    'account.dice3d.hint':
      'Digital dice tumble in three dimensions and settle on their face. Decorative: the result is the same without it.',
    'account.notifications.title': 'Game notifications',
    'account.notifications.hint':
      'Handout from the GM, combat start, your turn. Silences the announcements without hiding the sheet’s “your turn” banner. Applies to this device only.',
    'account.haptics.title': 'Haptic feedback',
    'account.haptics.hint': 'Short vibration on rolls and their outcomes. Applies to this device only.',
    'palette.open': 'Search everywhere',
    'palette.title': 'Search',
    'palette.placeholder': 'A character, a campaign, a rule…',
    'palette.hint': 'Search a character, a campaign, a screen, or any Codex entry.',
    'palette.close': 'Close search',
    'palette.empty': 'Nothing matches your search.',
    'palette.loading': 'Loading the Codex…',
    'palette.group.characters': 'Characters',
    'palette.group.campaigns': 'Campaigns',
    'palette.group.destinations': 'Go to',
    'palette.group.codex': 'The Codex',
    'palette.nav.home': 'My characters',
    'palette.nav.campaigns': 'My campaigns',
    'palette.nav.codex': 'The Codex',
    'palette.nav.account': 'My account',
    'palette.nav.create': 'Create a character',
    'palette.nav.join': 'Join a campaign',
    'palette.nav.packs': 'My content packs',
    'palette.keys.move': 'move',
    'palette.keys.select': 'open',
    'palette.keys.close': 'close',
    'palette.character.level': 'lvl',
    'palette.campaign.gm': 'You are GM',
    'palette.campaign.player': 'You play here',
    'nav.tabs.aria': 'Main areas',
    'nav.tab.characters': 'Characters',
    'nav.tab.campaigns': 'Campaigns',
    'nav.tab.codex': 'Codex',
    'library.title': 'Library',
    'library.subtitle': 'Your heroes and heroines',
    'library.cta.create': 'Create a character',
    'library.cta.join': 'Join a campaign',
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
    'library.card.campaign': 'Campaign',
    'dm.title': 'DM table',
    'dm.subtitle': 'Party overview',
    'dm.empty.title': 'No heroes to lead',
    'dm.empty.body':
      "Create or invite characters to lead their tale. The table lights up as soon as a companion joins the adventure.",
    'dm.party.title': 'Party',
    'dm.party.ariaList': 'Party members',
    'dm.party.openSheet': 'Open the sheet of',
    'dm.party.hpLabel': 'HP',
    'dm.party.acLabel': 'AC',
    'dm.party.initLabel': 'Init',
    'dm.party.conditionsAria': 'Active conditions',
    'dm.notes.title': 'Session notes',
    'dm.notes.placeholder':
      'Sketch plots, secrets, fragments to reveal at the table…',
    'dm.notes.localOnly':
      'Stored locally on this device. Sync across sessions arrives with the campaign journal.',
    'dm.notes.charsAria': 'Characters typed',
    'dm.secretRoll.title': 'Secret roll',
    'dm.secretRoll.subtitle': 'd20 + mod, out of sight',
    'dm.secretRoll.modLabel': 'Modifier',
    'dm.secretRoll.button': 'Roll in secret',
    'dm.secretRoll.normal': 'Normal',
    'dm.secretRoll.advantage': 'Advantage',
    'dm.secretRoll.disadvantage': 'Disadvantage',
    'dm.secretRoll.advantageAria': 'Roll mode',
    'dm.secretRoll.resultLabel': 'Total',
    'dm.secretRoll.detail': 'Detail',
    'dm.secretRoll.nat20': 'Natural 20',
    'dm.secretRoll.nat1': 'Natural 1',
    'dm.secretRoll.historyAria': 'Recent secret rolls',
    'dm.secretRoll.aboutLabel': 'About what?',
    'dm.secretRoll.aboutPlaceholder': 'Guard’s Perception…',
    'dm.secretRoll.reveal': 'Reveal to the table',
    'dm.secretRoll.revealed': 'Revealed',
    'dm.tip.revealSecretRoll': 'Re-logs this roll as visible to the whole table.',
    'campaigns.title': 'My campaigns',
    'campaigns.subtitle': 'The tables where your hero comes to life',
    'campaigns.list.aria': 'Campaign list',
    'campaigns.empty.title': 'No campaigns yet',
    'campaigns.empty.body':
      'Create your first campaign to gather a party, or join one with an invite code.',
    'campaigns.error.title': 'Cannot load',
    'campaigns.error.body':
      'Cannot fetch your campaigns. Check your connection and try again.',
    'campaigns.error.retry': 'Try again',
    'campaigns.cta.create': 'Create a campaign',
    'campaigns.cta.join': 'Join by code',
    'campaigns.card.openSoon': 'Opening soon',
    'campaigns.card.open': 'Open',
    'campaigns.card.leave': 'Leave',
    'campaigns.card.roleGm': 'GM',
    'campaigns.card.roleMember': 'Player',
    'campaigns.card.membersLabel': 'GMs',
    'campaigns.card.inviteCodeLabel': 'Code',
    'campaigns.card.dateLabel': 'Updated',
    'campaigns.create.title': 'New campaign',
    'campaigns.create.intro':
      'Give it an evocative name — this is the banner the party will gather under.',
    'campaigns.create.name.label': 'Campaign name',
    'campaigns.create.name.helper': '80 characters max',
    'campaigns.create.name.placeholder': 'The Shadow over Caer Dûn',
    'campaigns.create.description.label': 'Description',
    'campaigns.create.description.helper': 'Optional — a short pitch for the table.',
    'campaigns.create.description.placeholder':
      'An urban campaign in the misty city of Caer Dûn…',
    'campaigns.create.cancel': 'Cancel',
    'campaigns.create.submit': 'Create',
    'campaigns.create.submitting': 'Creating…',
    'campaigns.create.close': 'Close campaign creation',
    'campaigns.create.error.nameRequired': 'A name is required.',
    'campaigns.create.error.nameTooLong': 'Name must be 80 characters or fewer.',
    'campaigns.create.error.notSignedIn': 'You must be signed in to create a campaign.',
    'campaigns.create.error.inviteCollision':
      'Could not generate a unique invite code. Please try again.',
    'campaigns.create.error.generic':
      'Creation failed. Check your connection and try again.',
    'campaigns.leave.title': 'Leave campaign',
    'campaigns.leave.confirmPrefix': 'Leave',
    'campaigns.leave.confirmSuffix': '?',
    'campaigns.leave.dataNotice':
      'Your linked character stays safe in your library.',
    'campaigns.leave.cancel': 'Stay',
    'campaigns.leave.confirm': 'Leave',
    'campaigns.leave.submitting': 'Leaving…',
    'campaigns.leave.close': 'Close confirmation',
    'campaigns.leave.error.lastGm':
      'You are the last GM. Promote another player to co-GM before leaving.',
    'campaigns.leave.error.notFound': 'This campaign no longer exists.',
    'campaigns.leave.error.generic':
      'Leaving failed. Check your connection and try again.',
    'campaigns.detail.back': 'My campaigns',
    'campaigns.detail.leaveCta': 'Leave campaign',
    'campaigns.detail.invite.aria': 'Invite code',
    'campaigns.detail.invite.title': 'Invite to the table',
    'campaigns.detail.invite.codeLabel': 'Invite code',
    'campaigns.detail.invite.codeAria': 'Invite code to read aloud or copy',
    'campaigns.detail.invite.copy': 'Copy code',
    'campaigns.detail.invite.copied': 'Copied!',
    'campaigns.detail.invite.shareLink': 'Share link',
    'campaigns.detail.invite.linkCopied': 'Link copied!',
    'campaigns.detail.invite.shareTitle': 'Join my GrimWar campaign',
    'campaigns.detail.invite.help':
      'Anyone with this code can join the campaign. Share it only with invited players.',
    'campaigns.detail.invite.firstStepTitle': 'Invite your players',
    'campaigns.detail.invite.firstStepBody':
      'Your campaign is ready. Share the link or read the code aloud around the table: each player joins, then creates or links their character. You will see them appear here in the party.',
    'campaigns.detail.invite.rotate': 'Regenerate code',
    'campaigns.detail.invite.rotateConfirm': 'Confirm regeneration',
    'campaigns.detail.invite.rotateCancel': 'Keep current code',
    'campaigns.detail.invite.rotating': 'Regenerating…',
    'campaigns.detail.invite.rotateWarning':
      'The current code stops working immediately, along with any links already shared. Members who already joined are unaffected.',
    'campaigns.detail.invite.rotateError':
      'Regeneration failed. Check your connection and try again.',
    'campaigns.detail.invite.rotated': 'New code in place.',
    'campaigns.detail.roster.aria': 'Campaign members',
    'campaigns.detail.roster.title': 'The party',
    'campaigns.detail.dmTools.title': 'Game master tools',
    'campaigns.detail.dmTools.aria': 'Game master tools — secret roll and scratchpad',
    'campaigns.dmTools.open': 'Tools',
    'campaigns.dmTools.openTip': 'Secret roll and scratchpad, without leaving the table.',
    'campaigns.detail.roster.youSuffix': '(you)',
    'campaigns.detail.roster.promote': 'Promote to GM',
    'campaigns.detail.roster.demote': 'Demote',
    'campaigns.detail.roster.kick': 'Remove',
    'campaigns.detail.roster.viewSheet': 'View sheet',
    'campaigns.memberAction.close': 'Close confirmation',
    'campaigns.memberAction.cancel': 'Cancel',
    'campaigns.memberAction.demote.title': 'Demote this GM',
    'campaigns.memberAction.demote.confirmPrefix': 'Revoke GM rights from',
    'campaigns.memberAction.demote.confirmSuffix': '?',
    'campaigns.memberAction.demote.notice':
      'They become a player again and keep their seat at the table: they only lose authority over the campaign. Demotion is reversible — you can promote them again at any time.',
    'campaigns.memberAction.demote.confirm': 'Demote',
    'campaigns.memberAction.demote.submitting': 'Demoting…',
    'campaigns.memberAction.kick.title': 'Remove this member',
    'campaigns.memberAction.kick.confirmPrefix': 'Remove from the campaign',
    'campaigns.memberAction.kick.confirmSuffix': '?',
    'campaigns.memberAction.kick.notice':
      'They lose access to the campaign, its sessions and its journal. Their character sheet belongs to them and stays intact in their library. They can come back with the invite code.',
    'campaigns.memberAction.kick.confirm': 'Confirm removal',
    'campaigns.memberAction.kick.submitting': 'Removing…',
    'campaigns.memberAction.error.notFound': 'This campaign no longer exists.',
    'campaigns.memberAction.error.lastGm':
      'Not possible: a campaign must always keep at least one GM. Promote another member first.',
    'campaigns.memberAction.error.generic':
      'The operation failed. Check your connection and try again.',
    'campaigns.detail.party.aria': 'Live party combat status',
    'campaigns.detail.party.title': 'Party status',
    'campaigns.detail.party.empty': 'No player has linked a character yet.',
    'campaigns.detail.party.cardLoading': 'Loading…',
    'campaigns.detail.party.cardError': 'Sheet unavailable',
    'campaigns.detail.party.cardUnavailable': 'Character not found',
    'campaigns.detail.partyAggregate.aria': 'Party summary for the GM',
    'campaigns.detail.partyAggregate.size': 'Size',
    'campaigns.detail.partyAggregate.avgLevel': 'Avg. level',
    'campaigns.detail.partyAggregate.levelRange': 'Levels',
    'campaigns.detail.partyAggregate.downed': 'Downed',
    'campaigns.detail.myCharacter.aria': 'My character in this campaign',
    'campaigns.detail.myCharacter.title': 'My character',
    'campaigns.detail.myCharacter.none': 'No character linked yet.',
    'campaigns.detail.myCharacter.loading': 'Loading character…',
    'campaigns.detail.myCharacter.unknown':
      'Linked character not found (deleted or not loaded).',
    'campaigns.detail.myCharacter.levelPrefix': 'Level',
    'campaigns.detail.myCharacter.link': 'Link a character',
    'campaigns.detail.myCharacter.change': 'Change',
    'campaigns.detail.myCharacter.open': 'Open my sheet',
    'campaigns.detail.myCharacter.create': 'Create a character',
    'campaigns.detail.myCharacter.linkExisting': 'Link an existing one',
    'campaigns.detail.myCharacter.firstStepTitle': 'Join the adventure',
    'campaigns.detail.myCharacter.firstStepBody':
      'Welcome to the table. Create your character or link an existing one to take your seat in the campaign.',
    'campaigns.detail.error.title': 'Cannot load',
    'campaigns.detail.error.body':
      'Cannot fetch this campaign. Check your connection and try again.',
    'campaigns.detail.error.retry': 'Try again',
    'campaigns.detail.error.notFoundTitle': 'Campaign not found',
    'campaigns.detail.error.notFoundBody':
      'This campaign no longer exists or you no longer have access.',
    // GM reading a player's sheet — JALON 4A.3
    'campaigns.memberSheet.back': 'Back to campaign',
    'campaigns.memberSheet.viewingPrefix': 'Sheet of',
    'campaigns.memberSheet.forbidden.title': 'GM access only',
    'campaigns.memberSheet.forbidden.body':
      "Only a GM of this campaign can view a player's sheet.",
    'campaigns.memberSheet.memberNotFound.title': 'Member not found',
    'campaigns.memberSheet.memberNotFound.body':
      'This player is not (or no longer) part of this campaign.',
    'campaigns.memberSheet.noCharacter.title': 'No linked sheet',
    'campaigns.memberSheet.noCharacter.body':
      'This player has not linked a character to the campaign yet.',
    'campaigns.memberSheet.error.title': 'Sheet unavailable',
    'campaigns.memberSheet.error.body':
      'Cannot load this sheet. The player may have unlinked it, or you are no longer a GM of their campaign.',
    'campaigns.detail.eventFeed.aria': 'Campaign activity log',
    'campaigns.detail.eventFeed.title': 'Recent activity',
    'campaigns.detail.eventFeed.empty': 'No activity recorded yet.',
    'campaigns.detail.eventFeed.loading': 'Loading activity…',
    'campaigns.detail.eventFeed.error': 'Unable to load campaign activity.',
    'campaigns.detail.eventFeed.dmOnlyHint': 'Visible to the GM only.',
    'campaigns.detail.eventFeed.levelPrefix': 'Level ',
    'campaigns.detail.eventFeed.kind.roll': 'Dice roll',
    'campaigns.detail.eventFeed.kind.hpChange': 'Hit points',
    'campaigns.detail.eventFeed.kind.tempHp': 'Temporary HP',
    'campaigns.detail.eventFeed.kind.conditionAdd': 'Condition added',
    'campaigns.detail.eventFeed.kind.conditionRemove': 'Condition removed',
    'campaigns.detail.eventFeed.kind.spellCast': 'Spell cast',
    'campaigns.detail.eventFeed.kind.slotConsumed': 'Slot spent',
    'campaigns.detail.eventFeed.kind.slotRestored': 'Slot restored',
    'campaigns.detail.eventFeed.kind.itemAcquired': 'Item acquired',
    'campaigns.detail.eventFeed.kind.itemRemoved': 'Item removed',
    'campaigns.detail.eventFeed.kind.secretRoll': 'GM secret roll',
    'campaigns.detail.eventFeed.kind.sessionStart': 'Session started',
    'campaigns.detail.eventFeed.kind.sessionEnd': 'Session ended',
    'campaigns.detail.eventFeed.kind.generic': 'Game event',
    'campaigns.detail.eventFeed.kind.dmEdit': 'GM edit',
    'campaigns.detail.eventFeed.dmEdit.summary': '{count} field(s) changed',
    'campaigns.detail.eventFeed.dmEdit.fieldsRow': 'Fields changed',
    'campaigns.detail.eventFeed.dmEditField.generic': 'Other field',
    'campaigns.detail.eventFeed.dmEditField.hp': 'Hit points',
    'campaigns.detail.eventFeed.dmEditField.conditions': 'Conditions',
    'campaigns.detail.eventFeed.dmEditField.exhaustion': 'Exhaustion',
    'campaigns.detail.eventFeed.dmEditField.inspiration': 'Inspiration',
    'campaigns.detail.eventFeed.dmEditField.deathSaves': 'Death saves',
    'campaigns.detail.eventFeed.dmEditField.abilities': 'Ability scores',
    'campaigns.detail.eventFeed.dmEditField.saveProficiencies': 'Saving throws',
    'campaigns.detail.eventFeed.dmEditField.skills': 'Skills',
    'campaigns.detail.eventFeed.dmEditField.ac': 'Armor class',
    'campaigns.detail.eventFeed.dmEditField.speed': 'Speed',
    'campaigns.detail.eventFeed.dmEditField.initiative': 'Initiative',
    'campaigns.detail.eventFeed.dmEditField.hitDice': 'Hit dice',
    'campaigns.detail.eventFeed.dmEditField.spellSlots': 'Spell slots',
    'campaigns.detail.eventFeed.dmEditField.classResources': 'Class resources',
    'campaigns.detail.eventFeed.dmEditField.preparedSpells': 'Prepared spells',
    'campaigns.detail.eventFeed.dmEditField.knownSpells': 'Known spells',
    'campaigns.detail.eventFeed.dmEditField.inventory': 'Inventory',
    'campaigns.detail.eventFeed.dmEditField.featureUsage': 'Features',
    'campaigns.detail.eventFeed.dmEditField.extraProficiencies': 'Proficiencies',
    'campaigns.detail.eventFeed.dmEditField.experience': 'Experience',
    'campaigns.detail.eventFeed.dmEditField.alignment': 'Alignment',
    'campaigns.detail.eventFeed.dmEditField.totalLevel': 'Level',
    'campaigns.detail.eventFeed.dmEditField.status': 'Status',
    'campaigns.detail.eventFeed.dmEditField.stats': 'Statistics',
    'campaigns.memberSheet.dmEditBadge': 'GM edit',
    'sheet.dmEdit.bannerTitle': 'GM editing',
    'sheet.dmEdit.bannerHint':
      "You are editing a player's sheet. Name and personality stay reserved to the player.",
    'sheet.dmEdit.fieldLocked': 'Player-owned',
    'journal.tpl.dmEdit': "The DM adjusts **{target}**'s sheet ({count} field(s)).",
    'sessions.events.title': 'Session events',
    'sessions.events.empty': 'No events recorded for this session yet.',
    'sessions.events.loading': 'Loading events…',
    'sessions.events.error': "Couldn't load events.",
    'sessions.events.filter.aria': 'Filter events by kind',
    'sessions.events.filter.all': 'All',
    'sessions.events.filter.dmEdits': 'GM edits',
    'campaigns.detail.eventFeed.openDetail': 'View event details',
    'campaigns.detail.eventFeed.filter.aria': 'Filter activity by player',
    'campaigns.detail.eventFeed.filter.all': 'All',
    'campaigns.detail.eventFeed.filter.emptyForPlayer':
      'No activity for this player yet.',
    'campaigns.detail.eventFeed.detail.close': 'Close details',
    'campaigns.detail.eventFeed.detail.actor': 'Actor',
    'campaigns.detail.eventFeed.detail.target': 'Target',
    'campaigns.detail.eventFeed.detail.dmActor': 'GM',
    'campaigns.detail.eventFeed.detail.systemActor': 'System',
    'campaigns.detail.eventFeed.detail.unknownCharacter': 'Character',
    'campaigns.detail.eventFeed.detail.noDetail': 'No additional details.',
    'campaigns.detail.eventFeed.detail.delete': 'Remove from journal',
    'campaigns.detail.eventFeed.detail.deleteConfirm': 'Confirm removal',
    'campaigns.detail.eventFeed.detail.deleteError': 'Removal failed.',
    'campaigns.detail.eventFeed.field.label': 'Label',
    'campaigns.detail.eventFeed.field.total': 'Total',
    'campaigns.detail.eventFeed.field.modifier': 'Modifier',
    'campaigns.detail.eventFeed.field.dice': 'Dice',
    'campaigns.detail.eventFeed.field.before': 'Before',
    'campaigns.detail.eventFeed.field.after': 'After',
    'campaigns.detail.eventFeed.field.delta': 'Change',
    'campaigns.detail.eventFeed.field.reason': 'Cause',
    'campaigns.detail.eventFeed.field.level': 'Level',
    'campaigns.detail.eventFeed.field.slot': 'Slot',
    'campaigns.detail.eventFeed.field.count': 'Count',
    'campaigns.detail.eventFeed.field.quantity': 'Quantity',
    'campaigns.detail.eventFeed.field.components': 'Components',
    'campaigns.detail.eventFeed.field.crit': 'Critical hit',
    'campaigns.detail.eventFeed.field.fumble': 'Critical miss',
    'campaigns.detail.eventFeed.reason.damage': 'Damage',
    'campaigns.detail.eventFeed.reason.heal': 'Healing',
    'campaigns.detail.eventFeed.value.yes': 'Yes',
    'campaigns.detail.eventFeed.value.no': 'No',
    'campaigns.join.title': 'Join a campaign',
    'campaigns.join.intro': 'Ask the GM for the invite code and enter it here.',
    'campaigns.join.code.label': 'Invite code',
    'campaigns.join.code.helper':
      '6 characters — letters and digits, no I or O.',
    'campaigns.join.code.placeholder': 'ABC234',
    'campaigns.join.cancel': 'Cancel',
    'campaigns.join.submit': 'Join',
    'campaigns.join.submitting': 'Joining…',
    'campaigns.join.error.lengthInvalid':
      'The code must be exactly 6 characters.',
    'campaigns.join.error.formatInvalid':
      'The code uses letters and digits (no 0, 1, I, or O).',
    'campaigns.join.error.codeNotFound':
      'No campaign matches this code. Double-check with the GM.',
    'campaigns.join.error.campaignNotFound':
      'This campaign no longer exists. Ask the GM for a new code.',
    'campaigns.join.error.notSignedIn':
      'You must be signed in to join a campaign.',
    'campaigns.join.error.generic':
      'Joining failed. Check your connection and try again.',
    'campaigns.promote.title': 'Promote to GM',
    'campaigns.promote.confirmPrefix': 'Grant GM rights to',
    'campaigns.promote.confirmSuffix': '?',
    'campaigns.promote.notice':
      'A co-GM can edit the campaign, invite and admit members. The role is irreversible from the player side — only a GM can demote another GM.',
    'campaigns.promote.cancel': 'Cancel',
    'campaigns.promote.confirm': 'Promote',
    'campaigns.promote.submitting': 'Promoting…',
    'campaigns.promote.close': 'Close confirmation',
    'campaigns.promote.error.notFound': 'This campaign no longer exists.',
    'campaigns.promote.error.generic':
      'Promotion failed. Check your connection and try again.',
    'campaigns.linkCharacter.title': 'Link a character',
    'campaigns.linkCharacter.intro':
      'Pick the character you play in this campaign. The GM will be able to view its sheet.',
    'campaigns.linkCharacter.loading': 'Loading your characters…',
    'campaigns.linkCharacter.empty':
      "You don't have any character yet. Create one from your library, then come back to link it.",
    'campaigns.linkCharacter.listAria': 'Character to link',
    'campaigns.linkCharacter.noneOption': 'No character',
    'campaigns.linkCharacter.levelPrefix': 'Level',
    'campaigns.linkCharacter.currentSuffix': 'current',
    'campaigns.linkCharacter.cancel': 'Cancel',
    'campaigns.linkCharacter.confirm': 'Link',
    'campaigns.linkCharacter.submitting': 'Linking…',
    'campaigns.linkCharacter.close': 'Close link dialog',
    'campaigns.linkCharacter.error.generic':
      'Linking failed. Check your connection and try again.',
    'campaigns.detail.sessionsCta': 'Sessions',
    'campaigns.detail.encountersCta': 'Encounters',
    'campaigns.detail.journalCta': 'Journal',
    'campaigns.detail.handoutsCta': 'Handouts',
    'campaigns.detail.mapsCta': 'Maps',
    'campaigns.detail.mapsPlayerCta': 'View the map',
    'campaigns.detail.settingsCta': 'Settings',
    'campaigns.detail.spaces.aria': 'Campaign spaces',
    'campaigns.detail.spaces.play': 'Play',
    'campaigns.detail.spaces.memory': 'Table memory',
    'campaigns.settings.title': 'Campaign settings',
    'campaigns.settings.intro':
      'Adjust the name, the table’s dice mode and optional rules. These choices apply to the whole campaign.',
    'campaigns.settings.close': 'Close settings',
    'campaigns.settings.cancel': 'Cancel',
    'campaigns.settings.save': 'Save',
    'campaigns.settings.saving': 'Saving…',
    'campaigns.settings.error.generic':
      'Settings could not be saved. Try again.',
    'campaigns.settings.status.title': 'Campaign status',
    'campaigns.settings.status.hint':
      'Where your campaign stands. A paused or archived campaign stays readable, but signals to the table that it is no longer active.',
    'campaigns.settings.status.active.label': 'Active',
    'campaigns.settings.status.active.hint': 'The campaign is under way.',
    'campaigns.settings.status.paused.label': 'Paused',
    'campaigns.settings.status.paused.hint':
      'A lull between arcs — you will resume later.',
    'campaigns.settings.status.archived.label': 'Archived',
    'campaigns.settings.status.archived.hint':
      'The campaign is over. It remains among your memories.',
    'campaigns.status.paused': 'Paused',
    'campaigns.status.archived': 'Archived',
    'campaigns.detail.statusBanner.paused':
      'This campaign is paused — sessions are on hold for now.',
    'campaigns.detail.statusBanner.archived':
      'This campaign is archived — it stays available to read.',
    'campaigns.settings.dice.title': 'Table dice mode',
    'campaigns.settings.dice.hint':
      'The table’s default mode. Each player can follow it or pick their own in their account.',
    'campaigns.settings.variants.title': '5e variants',
    'campaigns.settings.variants.hint':
      'Optional rules applied to the whole table. Off by default.',
    'campaigns.settings.variants.featAtLevel1.label': 'Feat at level 1',
    'campaigns.settings.variants.featAtLevel1.desc':
      'Every character gains one extra feat at creation.',
    'campaigns.settings.variants.flanking.label': 'Flanking',
    'campaigns.settings.variants.flanking.desc':
      'Two foes on opposite sides of a creature gain advantage on melee attacks.',
    'campaigns.settings.variants.slowHealing.label': 'Slow natural healing',
    'campaigns.settings.variants.slowHealing.desc':
      'A long rest no longer restores all HP: you recover by spending hit dice.',
    'campaigns.settings.variants.grittyRealism.label': 'Gritty realism',
    'campaigns.settings.variants.grittyRealism.desc':
      'Short rest is 8 hours, long rest is 7 days.',
    // Handouts DM→player — plan 27
    'handouts.toast.title': 'The DM sent you a handout',
    'encounters.toast.started.title': 'Combat begins',
    'encounters.toast.yourTurn.title': 'Your turn',
    'encounters.toast.yourTurn.sub': 'Round {n} · {name}',
    'handouts.screen.back': 'Back to campaign',
    'handouts.screen.title': 'Handouts',
    'handouts.screen.subtitleDm': 'Maps, letters and clues shared with the table.',
    'handouts.screen.subtitlePlayer': 'Handouts the DM has shared with you.',
    'handouts.screen.newCta': 'New handout',
    'handouts.search.placeholder': 'Search a title, a word from the text…',
    'handouts.search.aria': 'Search handouts',
    'handouts.search.noMatch': 'No handout matches this search.',
    'handouts.screen.empty.dm': 'No handout shared yet.',
    'handouts.screen.empty.player': 'The DM has not shared any handout with you.',
    'handouts.screen.activeHeading': 'Active',
    'handouts.screen.archivedHeading': 'Archived',
    'handouts.screen.loadError': 'Could not load handouts.',
    'handouts.card.recipientsAll': 'Whole table',
    'handouts.card.recipientsTargeted': 'Targeted',
    'handouts.card.open': 'Open',
    'handouts.card.archive': 'Archive',
    'handouts.card.archivedBadge': 'Archived',
    'handouts.card.openedBadge': 'Opened',
    'handouts.card.newBadge': 'New',
    'handouts.detail.close': 'Close handout',
    'handouts.create.title': 'New handout',
    'handouts.create.fieldTitle': 'Title',
    'handouts.create.titlePlaceholder': 'Handout title',
    'handouts.create.fieldType': 'Type',
    'handouts.create.type.text': 'Text',
    'handouts.create.type.image': 'Image',
    'handouts.create.type.mixed': 'Both',
    'handouts.create.imageDeferred':
      'Image upload is coming soon — for now, share a text handout.',
    'handouts.create.fieldContent': 'Content',
    'handouts.create.contentPlaceholder':
      'Write the handout. Markdown: ## heading, - list, **bold**, _italic_.',
    'handouts.create.previewLabel': 'Preview',
    'handouts.create.previewEmpty': 'The preview will appear here.',
    'handouts.create.fieldRecipients': 'Recipients',
    'handouts.create.recipientsAll': 'Whole table',
    'handouts.create.recipientsSome': 'Pick players',
    'handouts.create.noPlayers': 'No player has joined the campaign yet.',
    'handouts.create.cancel': 'Cancel',
    'handouts.create.send': 'Send',
    'handouts.create.sending': 'Sending…',
    'handouts.create.error.title': 'Give the handout a title.',
    'handouts.create.error.content': 'The handout is empty.',
    'handouts.create.error.recipients': 'Pick at least one recipient.',
    'handouts.create.error.send': 'Sending failed. Check your connection and try again.',
    'handouts.create.sentToast': 'Handout sent',
    // Lifecycle of a sent handout (M12)
    'handouts.card.edit': 'Correct',
    'handouts.card.unarchive': 'Unarchive',
    'handouts.card.delete': 'Delete',
    'handouts.card.deleteConfirm': 'Confirm deletion',
    'handouts.card.recipientsNone': 'No recipient',
    'handouts.edit.title': 'Correct the handout',
    'handouts.edit.save': 'Save corrections',
    'handouts.edit.saving': 'Saving…',
    'handouts.edit.savedToast': 'Handout corrected',
    'campaigns.tip.editHandout':
      'Correct the title, text or recipients. Adding a player notifies them.',
    'campaigns.tip.unarchiveHandout': 'Put this handout back in the active flow.',
    'campaigns.tip.deleteHandout':
      'Erase this handout for good. Archiving keeps a trace instead.',
    // NPCs — plan 28
    'campaigns.detail.npcsCta': 'NPCs',
    'campaigns.detail.eventFeed.kind.npcIntroduced': 'NPC introduced',
    'campaigns.detail.eventFeed.kind.npcAttitudeChanged': 'NPC attitude',
    'npcs.role.merchant': 'Merchant',
    'npcs.role.ally': 'Ally',
    'npcs.role.enemy': 'Enemy',
    'npcs.role.contact': 'Contact',
    'npcs.role.noble': 'Noble',
    'npcs.role.other': 'Other',
    'npcs.attitude.friendly': 'Friendly',
    'npcs.attitude.neutral': 'Neutral',
    'npcs.attitude.hostile': 'Hostile',
    'npcs.attitude.unknown': 'Unknown',
    'npcs.visibility.all': 'Visible to players',
    'npcs.visibility.dm': 'Secret (DM only)',
    'npcs.screen.back': 'Back to campaign',
    'npcs.screen.title': 'Non-player characters',
    'npcs.screen.subtitleDm':
      'Merchants, allies, contacts and recurring foes of your campaign.',
    'npcs.screen.subtitlePlayer': 'The figures you have encountered.',
    'npcs.screen.newCta': 'New NPC',
    'npcs.screen.empty.dm': 'No NPCs yet. Create the first to populate your world.',
    'npcs.screen.empty.player': 'You have not met any notable character yet.',
    'npcs.screen.noMatch': 'No NPC matches these filters.',
    'npcs.screen.loadError': 'Could not load NPCs.',
    'npcs.screen.loading': 'Loading…',
    'npcs.card.secretBadge': 'Secret',
    'npcs.card.combatBadge': 'Combat',
    'npcs.filters.aria': 'NPC directory filters',
    'npcs.filters.role': 'Role',
    'npcs.filters.tag': 'Tag',
    'npcs.filters.location': 'Location',
    'npcs.filters.all': 'All',
    'npcs.detail.back': 'Back to directory',
    'npcs.detail.notFound': 'This NPC could not be found.',
    'npcs.detail.edit': 'Edit',
    'npcs.detail.delete': 'Delete',
    'npcs.detail.duplicate': 'Duplicate',
    'npcs.duplicate.title': 'Duplicate into another campaign',
    'npcs.duplicate.intro':
      'Pick the table that will receive a copy of this non-player character.',
    'npcs.duplicate.helper':
      'The copy arrives secret and without its relationships: those point at characters from this campaign, which do not exist over there.',
    'npcs.duplicate.noTarget': 'You do not run any other campaign yet.',
    'npcs.duplicate.confirm': 'Duplicate',
    'npcs.duplicate.busy': 'Duplicating…',
    'npcs.duplicate.cancel': 'Cancel',
    'npcs.duplicate.error': 'The duplication did not go through. Try again.',
    'npcs.duplicate.doneToast': 'Character duplicated',
    'npcs.search.placeholder': 'Search a name, a place, a tag…',
    'npcs.search.aria': 'Search non-player characters',
    'npcs.sort.aria': 'List order',
    'npcs.sort.introduction': 'Order met',
    'npcs.sort.alpha': 'Alphabetical',
    'npcs.detail.secretBadge': 'Secret',
    'npcs.detail.publicHeading': 'Description',
    'npcs.detail.relationsHeading': 'Relationships',
    'npcs.detail.relations.editCta': 'Edit relationships',
    'npcs.detail.relations.empty': 'No relationship recorded.',
    'npcs.detail.combatHeading': 'Combat statistics',
    'npcs.detail.combat.cr': 'CR',
    'npcs.detail.combat.ac': 'AC',
    'npcs.detail.combat.hp': 'HP',
    'npcs.detail.combat.monster': 'Linked monster',
    'npcs.detail.dmNotesHeading': 'DM notes',
    'npcs.detail.dmOnlyHint': 'DM only',
    'npcs.detail.dmNotesEmpty': 'No secret note.',
    'npcs.detail.deletedToast': 'NPC deleted',
    'npcs.detail.deleteError': 'Deletion failed.',
    'npcs.detail.deleteConfirm.title': 'Delete this NPC?',
    'npcs.detail.deleteConfirm.body': '“{name}” will be permanently deleted.',
    'npcs.detail.deleteConfirm.cancel': 'Cancel',
    'npcs.detail.deleteConfirm.confirm': 'Delete',
    'npcs.detail.deleteConfirm.deleting': 'Deleting…',
    'npcs.relations.title': 'NPC relationships',
    'npcs.relations.close': 'Close',
    'npcs.relations.done': 'Done',
    'npcs.relations.noCharacters': 'No player character in this campaign yet.',
    'npcs.relations.error': 'Update failed.',
    'npcs.edit.createTitle': 'New NPC',
    'npcs.edit.editTitle': 'Edit NPC',
    'npcs.edit.field.name': 'Name',
    'npcs.edit.field.namePlaceholder': 'Character name',
    'npcs.edit.field.role': 'Role',
    'npcs.edit.field.location': 'Location',
    'npcs.edit.field.locationPlaceholder': 'Where do they appear?',
    'npcs.edit.field.portrait': 'Portrait',
    'npcs.edit.field.portraitHelper': 'A letter or an emoji.',
    'npcs.edit.field.portraitPlaceholder': 'A',
    'npcs.edit.field.shortDescription': 'Summary',
    'npcs.edit.field.shortDescriptionPlaceholder': 'One or two sentences.',
    'npcs.edit.field.publicDescription': 'Public description',
    'npcs.edit.field.publicDescriptionPlaceholder': 'What players know about this character.',
    'npcs.edit.markdownHelper': 'Markdown: ## heading, - list, **bold**, _italic_.',
    'npcs.edit.field.dmNotes': 'DM notes',
    'npcs.edit.field.dmNotesHelper': 'Secret — never shown to players.',
    'npcs.edit.field.dmNotesPlaceholder': 'Secrets, intentions, hidden hooks…',
    'npcs.edit.field.tags': 'Tags',
    'npcs.edit.field.tagsHelper': 'Comma-separated.',
    'npcs.edit.field.tagsPlaceholder': 'recurring, faction-x',
    'npcs.edit.field.visibility': 'Visibility',
    'npcs.edit.field.visibilityHelper': 'A secret NPC stays fully invisible to players.',
    'npcs.edit.portraitImageAdd': 'Add a photo',
    'npcs.edit.portraitImageReplace': 'Replace the photo',
    'npcs.edit.portraitImageRemove': 'Remove the photo',
    'npcs.edit.portraitImageBusy': 'Optimising…',
    'npcs.edit.portraitImageError': 'This image could not be read.',
    'npcs.edit.portraitImageAlt': 'Portrait of',
    'npcs.edit.combat.enable': 'Combatant NPC',
    'npcs.edit.combat.cr': 'CR',
    'npcs.edit.combat.ac': 'AC',
    'npcs.edit.combat.hp': 'HP',
    'npcs.edit.combat.notes': 'Combat notes',
    'npcs.edit.combat.linkMonster': 'Link a monster',
    'npcs.edit.combat.unlinkMonster': 'Unlink',
    'npcs.edit.combat.linkMonsterHelper':
      'The linked monster fills in CR, AC and HP — all still editable — and gives the tracker its full stat block.',
    'npcs.edit.cancel': 'Cancel',
    'npcs.edit.save': 'Save',
    'npcs.edit.saving': 'Saving…',
    'npcs.edit.error.name': 'Give the NPC a name.',
    'npcs.edit.error.save': 'Save failed. Check your connection and try again.',
    'npcs.edit.createdToast': 'NPC created',
    'npcs.edit.updatedToast': 'NPC updated',
    'encounters.create.npcs.title': 'NPCs',
    'encounters.create.npcs.intro': 'Add saved campaign NPCs to the encounter.',
    'encounters.create.npcs.empty': 'No saved NPC. Create some in the NPC directory.',
    'encounters.create.npcs.hpLabel': 'HP',
    'encounters.create.error.npcHp': 'Enter valid HP for each NPC added.',
    // Sessions — JALON 23.2
    'sessions.back': 'Back to campaign',
    'sessions.title': 'Sessions',
    'sessions.list.aria': 'List of campaign sessions',
    'sessions.cta.plan': 'Plan a session',
    'sessions.empty.gm':
      'No sessions yet. Plan the first one to start tracking the campaign timeline.',
    'sessions.empty.member': 'The DM has not planned any session yet.',
    'sessions.row.numberPrefix': 'Session ',
    'sessions.status.planned': 'Planned',
    'sessions.status.active': 'Active',
    'sessions.status.completed': 'Completed',
    'sessions.status.cancelled': 'Cancelled',
    'sessions.error.title': 'Unable to load',
    'sessions.error.body':
      "This campaign's sessions could not be loaded. Check your connection and try again.",
    'sessions.error.retry': 'Retry',
    'sessions.create.title': 'New session',
    'sessions.create.intro': 'Give the session a title. The number is assigned automatically.',
    'sessions.create.titleField.label': 'Session title',
    'sessions.create.titleField.helper': 'E.g. “Ambush at the pass”.',
    'sessions.create.titleField.placeholder': 'Session title',
    'sessions.create.date.label': 'Planned date',
    'sessions.create.date.helper': 'Optional — leave empty if the date is not set.',
    'sessions.create.cancel': 'Cancel',
    'sessions.create.submit': 'Plan',
    'sessions.create.submitting': 'Creating…',
    'sessions.create.close': 'Close planning dialog',
    'sessions.create.error.titleRequired': 'The title is required.',
    'sessions.create.error.titleTooLong': 'The title is too long (120 characters max).',
    'sessions.create.error.generic': 'Creation failed. Check your connection and try again.',
    // Session screen — JALON 23.3
    'sessions.detail.back': 'Back to sessions',
    'sessions.detail.error.title': 'Unable to load',
    'sessions.detail.error.body':
      'This session could not be loaded. Check your connection and try again.',
    'sessions.detail.error.notFoundTitle': 'Session not found',
    'sessions.detail.error.notFoundBody': 'This session no longer exists or its link is invalid.',
    'sessions.tabs.aria': 'Session tabs',
    'sessions.tab.notes': 'Notes',
    'sessions.tab.attendance': 'Attendance',
    'sessions.tab.events': 'Events',
    'sessions.tab.journal': 'Journal',
    'sessions.notes.label': 'Session notes',
    'sessions.notes.placeholder':
      'Jot down what happened, the table’s decisions, leads to follow up…',
    'sessions.notes.editorAria': 'Session notes editor',
    'sessions.notes.hint':
      'Auto-saved. Text is stored as-is (Markdown); rich formatting will come later.',
    'sessions.notes.empty': 'No notes for this session.',
    'sessions.notes.status.pending': 'Edited',
    'sessions.notes.status.saving': 'Saving…',
    'sessions.notes.status.saved': 'Saved',
    'sessions.notes.status.error': 'Save failed',
    'sessions.attendance.title': 'Session attendance',
    'sessions.attendance.empty': 'No members at the table yet.',
    'sessions.attendance.status.saving': 'Saving…',
    'sessions.attendance.status.saved': 'Saved',
    'sessions.attendance.status.error': 'Save failed',
    'sessions.journal.placeholder':
      'The compiled session journal will appear here when the session ends.',
    'sessions.journal.emptyTitle': 'No compiled journal',
    'sessions.journal.emptyBody':
      'The narrative journal for this session will be compiled from events when it ends.',
    'sessions.journal.emptyBodyDm':
      'The journal compiles automatically when the session ends. You can also compile it now from the events already recorded.',
    'sessions.journal.compile': 'Compile journal',
    'sessions.journal.recompile': 'Recompile from events',
    'sessions.journal.compiling': 'Compiling…',
    'sessions.journal.compileError':
      'Journal compilation failed. Check your connection and try again.',
    'sessions.journal.compiledHint':
      'Compiled from events. Events remain the source of truth.',
    'sessions.journal.edit': 'Edit',
    'sessions.journal.editLabel': 'Journal (Markdown)',
    'sessions.journal.save': 'Save',
    'sessions.journal.saving': 'Saving…',
    'sessions.journal.cancel': 'Cancel',
    'sessions.journal.saveError':
      'Saving the journal failed. Check your connection and try again.',
    'sessions.journal.editedHint':
      '“Recompile from events” will overwrite this manual edit.',
    'sessions.journal.recompileConfirmTitle': 'Recompile journal?',
    'sessions.journal.recompileConfirmBody':
      'This rewrites the journal from events and overwrites any manual edit. Events remain the source of truth.',
    'sessions.journal.recompileConfirm': 'Recompile and overwrite',
    'sessions.journal.scope.legend': 'What the story carries',
    'sessions.journal.scope.rolls': 'Dice rolls',
    'sessions.journal.scope.monsterHp': 'Monster hit points',
    'sessions.journal.scope.dmOnly': 'Behind the screen',
    'sessions.journal.scope.help':
      'Unchecked, that kind of event stays out of the story. Nothing is lost: events remain the source of truth, you can recompile differently.',
    'sessions.action.start': 'Start session',
    'sessions.action.end': 'End session',
    'sessions.action.starting': 'Starting…',
    'sessions.action.ending': 'Ending…',
    'sessions.action.error.anotherActive':
      'Another session is already active. End it before starting a new one.',
    'sessions.action.error.generic': 'The action failed. Check your connection and try again.',
    // Session lifecycle (M13)
    'sessions.edit.cta': 'Edit session',
    'sessions.edit.title': 'Edit session',
    'sessions.edit.close': 'Close edit dialog',
    'sessions.edit.save': 'Save',
    'sessions.edit.saving': 'Saving…',
    'sessions.edit.number.label': 'Session number',
    'sessions.edit.number.helper':
      'Assigned automatically, but editable — a campaign picked up mid-run can start at session 42.',
    'sessions.edit.error.number': 'The number must be an integer greater than 0.',
    'sessions.edit.error.generic':
      'Saving failed. Check your connection and try again.',
    'sessions.action.cancel': 'Cancel session',
    'sessions.action.cancelConfirm': 'Confirm cancellation',
    'sessions.action.cancelNotice':
      'A cancelled session drops out of the campaign story: neither upcoming nor completed. You can reopen it.',
    'sessions.action.reopen': 'Reopen session',
    'sessions.action.reopening': 'Reopening…',
    'campaigns.tip.editSession': 'Correct the title, number or date.',
    'campaigns.tip.cancelSession':
      'Mark this session as never held, without closing it.',
    'campaigns.tip.reopenSession': 'Undo a wrong closure or cancellation.',
    // Combat encounters — JALON 24.2
    'encounters.back': 'Back to campaign',
    'encounters.title': 'Encounters',
    'encounters.list.aria': 'List of campaign encounters',
    'encounters.cta.create': 'Create an encounter',
    'encounters.empty.gm':
      'No encounters yet. Create one to prepare the next fight.',
    'encounters.empty.member':
      'No encounters yet. The DM will create one for the next fight.',
    'encounters.row.participantsSuffix': 'participants',
    'encounters.row.participantsSuffixOne': 'participant',
    'encounters.status.planned': 'Planned',
    'encounters.status.active': 'Active',
    'encounters.status.completed': 'Completed',
    'encounters.status.aborted': 'Aborted',
    'encounters.error.title': 'Unable to load',
    'encounters.error.body':
      'Encounters could not be loaded. Check your connection and try again.',
    'encounters.error.retry': 'Retry',
    'encounters.create.title': 'New encounter',
    'encounters.create.intro':
      'Table characters are added automatically. Add the monsters to fight.',
    'encounters.create.close': 'Close the creation window',
    'encounters.create.cancel': 'Cancel',
    'encounters.create.submit': 'Create',
    'encounters.create.submitting': 'Creating…',
    'encounters.create.nameField.label': 'Encounter name',
    'encounters.create.nameField.helper': 'E.g. “The goblin ambush”.',
    'encounters.create.nameField.placeholder': 'Encounter name',
    'encounters.create.party.title': 'Table characters',
    'encounters.create.party.empty':
      'No characters linked to the table. Players must link their sheet to be added.',
    'encounters.create.party.loading': 'Loading characters…',
    'encounters.create.party.error':
      'Some sheets could not be read and will not be added.',
    'encounters.create.party.hpLabel': 'HP',
    'encounters.create.monsters.title': 'Monsters',
    'encounters.create.monsters.intro':
      'Pick from the bestiary (name + HP prefilled) or enter by hand.',
    'encounters.create.monsters.nameLabel': 'Name',
    'encounters.create.monsters.namePlaceholder': 'E.g. “Goblin”',
    'encounters.create.monsters.hpLabel': 'HP',
    'encounters.create.monsters.hpPlaceholder': 'HP',
    'encounters.create.monsters.qtyLabel': 'Quantity',
    'encounters.create.monsters.addRow': 'Enter by hand',
    'encounters.create.monsters.fromBestiary': 'From the bestiary',
    'encounters.create.monsters.removeRow': 'Remove this monster',
    'encounters.create.error.nameRequired': 'The name is required.',
    'encounters.create.error.nameTooLong': 'The name is too long (120 characters max).',
    'encounters.create.error.noParticipants':
      'Add at least one character or monster to the encounter.',
    'encounters.create.error.monsterName': 'Every monster must have a name.',
    'encounters.create.error.monsterHp': 'Every monster must have HP greater than 0.',
    'encounters.create.error.generic':
      'Creation failed. Check your connection and try again.',
    // Encounters — combat screen (JALON 24.3)
    'encounters.detail.back': 'Back to encounters',
    'encounters.detail.codex': 'Codex',
    'encounters.detail.codexTip': 'Look up a rule or a monster without leaving combat.',
    'encounters.detail.roster': 'The party',
    'encounters.detail.rosterTip': 'See the party’s state without leaving combat.',
    'campaigns.roster.overlay.subtitle': 'The party’s state, without leaving the game.',
    'campaigns.roster.overlay.close': 'Close the party',
    'campaigns.roster.overlay.empty': 'Nobody at the table yet.',
    'encounters.detail.round': 'Round',
    'encounters.detail.error.title': 'Unable to load',
    'encounters.detail.error.body':
      'The encounter could not be loaded. Check your connection and try again.',
    'encounters.detail.error.notFoundTitle': 'Encounter not found',
    'encounters.detail.error.notFoundBody':
      'This encounter no longer exists or its identifier is invalid.',
    'encounters.detail.error.retry': 'Retry',
    'encounters.action.rollInit': 'Roll initiative',
    'encounters.action.rollingInit': 'Rolling…',
    'encounters.action.reroll': 'Re-roll',
    'encounters.action.start': 'Start combat',
    'encounters.action.starting': 'Starting…',
    'encounters.action.endTurn': 'End turn',
    'encounters.action.end': 'End combat',
    'encounters.action.ending': 'Ending…',
    'encounters.action.cancelEnd': 'Cancel',
    'encounters.action.previousTurn': 'Previous turn',
    'encounters.action.abort': 'Abandon the fight',
    'encounters.action.reopen': 'Reopen the fight',
    'encounters.action.reopening': 'Reopening…',
    'encounters.detail.closedHint':
      'This encounter is closed. Reopening puts it back where it left off.',
    'encounters.row.actions': 'Manage encounter',
    'encounters.row.manageTitle': 'Manage encounter',
    'encounters.row.manageCloseAria': 'Close encounter management',
    'encounters.row.renameLabel': 'Encounter name',
    'encounters.row.renameSave': 'Rename',
    'encounters.row.delete': 'Delete encounter',
    'encounters.row.deleteConfirm': 'Confirm deletion',
    'encounters.action.error.anotherActive':
      'Another encounter is already active. End it before starting a new one.',
    'encounters.action.error.noParticipants':
      'Add at least one participant before starting combat.',
    'encounters.action.error.generic':
      'The action failed. Check your connection and try again.',
    'encounters.outcome.prompt': 'Combat outcome',
    'encounters.outcome.victory': 'Victory',
    'encounters.outcome.defeat': 'Defeat',
    'encounters.outcome.fled': 'Fled',
    'encounters.turnOrder.title': 'Initiative order',
    'encounters.turnOrder.aria': 'Participants initiative order',
    'encounters.turnOrder.empty': 'Roll initiative to set the turn order.',
    'encounters.turnOrder.currentTurn': 'Current turn',
    'encounters.participant.initLabel': 'Init.',
    'encounters.participant.hpLabel': 'HP',
    'encounters.participant.typeMonster': 'Monster',
    'encounters.control.open': 'HP / Conditions',
    'encounters.control.hpTitle': 'Hit points',
    'encounters.control.amount': 'Amount',
    'encounters.control.damage': 'Damage',
    'encounters.control.heal': 'Heal',
    'encounters.control.applying': 'Applying…',
    'encounters.control.conditionsTitle': 'Conditions',
    'encounters.control.noConditions': 'No active conditions.',
    'encounters.control.addCondition': 'Apply a condition',
    'encounters.control.closeAria': 'Close control panel',
    'encounters.control.viewStatBlock': 'View stat block',
    'encounters.control.statBlockCloseAria': 'Close stat block',
    'encounters.control.tempHp': '+ Temp HP',
    'encounters.control.customCondition': 'Other condition',
    'encounters.control.customConditionPlaceholder': 'Marked by the Hunter…',
    'encounters.control.customConditionAdd': 'Apply',
    'encounters.control.noteTitle': 'Combatant note',
    'encounters.control.notePlaceholder': 'This one carries the key…',
    'encounters.control.noteSave': 'Save note',
    'encounters.playerControl.badge': 'Player sheet',
    'encounters.playerControl.help':
      'Hit points are applied to their sheet, and the edit is logged.',
    'encounters.playerControl.loading': 'Reading the sheet…',
    'encounters.playerControl.unreadable':
      'Sheet unreadable: the player may have unlinked it from the campaign.',
    'encounters.playerControl.open': 'Hit points',
    'encounters.control.editTitle': 'Edit combatant',
    'encounters.control.editName': 'Name',
    'encounters.control.editInitiative': 'Initiative',
    'encounters.control.editCurrentHp': 'Current HP',
    'encounters.control.editMaxHp': 'Max HP',
    'encounters.control.editSave': 'Save changes',
    'encounters.control.remove': 'Remove from combat',
    'encounters.control.removeConfirm': 'Confirm removal',
    'encounters.add.open': 'Add a combatant',
    'encounters.add.title': 'New combatant',
    'encounters.add.intro':
      'Reinforcements join at the end of the order, initiative 0. Enter or roll theirs next.',
    'encounters.add.closeAria': 'Close combatant form',
    'encounters.add.nameLabel': 'Name',
    'encounters.add.namePlaceholder': 'Goblin boss…',
    'encounters.add.hpLabel': 'HP',
    'encounters.add.typeLabel': 'Type',
    'encounters.add.typeMonster': 'Monster',
    'encounters.add.typeNpc': 'NPC',
    'encounters.add.fromBestiary': 'From the bestiary',
    'encounters.add.submit': 'Add to combat',
    'encounters.add.cancel': 'Cancel',
    'encounters.add.error.name': 'Give this combatant a name.',
    'encounters.add.error.hp': 'Enter valid HP (at least 1).',
    'encounters.handoff.title': 'Damage to apply',
    'encounters.handoff.help':
      'Recent rolls from players. Pick a target to apply the damage.',
    'encounters.handoff.aria': 'Damage to apply',
    'encounters.handoff.attackPrefix': 'Atk',
    'encounters.handoff.damageSuffix': 'damage',
    'encounters.handoff.attackInfo': 'Attack roll — compare to the target’s AC.',
    'encounters.handoff.apply': 'Apply to…',
    'encounters.handoff.chooseTarget': 'Target',
    'encounters.handoff.noTargets': 'No target available.',
    'encounters.handoff.dismiss': 'Dismiss',
    'encounters.handoff.unknownActor': 'Player',
    'encounters.party.title': 'Party status',
    'encounters.party.aria': 'Participants’ health status',
    'encounters.party.allies': 'Your party',
    'encounters.party.enemies': 'Enemies',
    'encounters.party.empty': 'No participants.',
    // Journal — auto narrative (plan 25.1). Placeholders `{xxx}` filled by
    // `fillTemplate`. EN is a working baseline; the S5 i18n pass refines it.
    'journal.section.exploration': 'Exploration',
    'journal.section.combat': 'Combat — {name}',
    'journal.section.combatOutcome.victory': 'Outcome: victory.',
    'journal.section.combatOutcome.defeat': 'Outcome: defeat.',
    'journal.section.combatOutcome.fled': 'Outcome: fled.',
    'journal.empty': '_No events recorded for this session._',
    'journal.actor.dm': 'The DM',
    'journal.actor.someone': 'Someone',
    'journal.tpl.sessionStart': 'Session {number} — “{title}” — begins.',
    'journal.tpl.sessionEnd': 'Session {number} — “{title}” — ends.',
    'journal.tpl.turnStart': '**{name}**’s turn (round {round}).',
    'journal.tpl.rollAttackCrit':
      '{actor} attacks and scores a **critical hit** ({label}, total {total})!',
    'journal.tpl.rollAttackFumble':
      '{actor} attacks and suffers a **critical miss** ({label}, total {total}).',
    'journal.tpl.rollAttack': '{actor} attacks ({label}) — total {total}.',
    'journal.tpl.rollDamage': '{actor} deals {total} damage ({label}).',
    'journal.tpl.rollSave': '{actor} attempts a saving throw ({label}) — total {total}.',
    'journal.tpl.rollCheck': '{actor} attempts a check ({label}) — total {total}.',
    'journal.tpl.rollDeathSave':
      '{actor} makes a death saving throw ({label}) — total {total}.',
    'journal.tpl.rollGeneric': '{actor} makes a roll ({label}) — total {total}.',
    'journal.tpl.spellCast':
      '{actor} casts **{spell}** (level {level}, a level {slot} slot is consumed).',
    'journal.tpl.spellCantrip': '{actor} casts the cantrip **{spell}**.',
    'journal.tpl.hpDamage': '{actor} takes {amount} damage — HP: {before} → {after}.',
    'journal.tpl.hpHeal': '{actor} recovers {amount} HP — HP: {before} → {after}.',
    'journal.tpl.tempHp': '{actor} gains {amount} temporary HP.',
    'journal.tpl.conditionAdd': '{actor} is now **{condition}**.',
    'journal.tpl.conditionRemove': '{actor} is no longer **{condition}**.',
    'journal.tpl.slotConsumedOne': '{actor} consumes a level {level} slot.',
    'journal.tpl.slotConsumedMany': '{actor} consumes {count} level {level} slots.',
    'journal.tpl.slotRestoredOne': '{actor} recovers a level {level} slot.',
    'journal.tpl.slotRestoredMany': '{actor} recovers {count} level {level} slots.',
    'journal.tpl.itemAcquiredOne': '{actor} acquires **{item}**.',
    'journal.tpl.itemAcquiredMany': '{actor} acquires **{item}** (×{qty}).',
    'journal.tpl.itemRemovedOne': '{actor} parts with **{item}**.',
    'journal.tpl.itemRemovedMany': '{actor} parts with **{item}** (×{qty}).',
    'journal.tpl.monsterHpChangeDamage': '**{name}** takes {amount} damage — HP: {before} → {after}.',
    'journal.tpl.monsterHpChangeHeal': '**{name}** recovers {amount} HP — HP: {before} → {after}.',
    // Journal — campaign-wide aggregate (plan 25.4)
    'journal.aggregate.title': 'Campaign journal',
    'journal.aggregate.subtitle': 'The compiled tale of your sessions, in order.',
    'journal.aggregate.back': 'Back to campaign',
    'journal.aggregate.export': 'Export (.md)',
    'journal.aggregate.exportSession': 'Export this session',
    'journal.aggregate.empty':
      'No completed sessions yet. The campaign journal fills in as you end sessions.',
    'journal.aggregate.sessionNumberPrefix': 'Session ',
    'journal.aggregate.notCompiled': 'Journal not compiled yet for this session.',
    'journal.aggregate.expand': 'Expand',
    'journal.aggregate.collapse': 'Collapse',
    'journal.aggregate.error': 'Loading the journal failed.',
    'journal.aggregate.retry': 'Retry',
    'avoir.customItem.placeholder': 'My personal treasure',
    'sheet.avoir.attunement.title': 'Attunement',
    'sheet.avoir.attunement.count': '{count} / {cap} attuned items',
    'sheet.avoir.attunement.empty': 'No attuned items.',
    'sheet.avoir.attunement.atCap': 'Limit reached',
    // Inventory mode — inventory, purse, add/create item, detail
    'sheet.avoir.close': 'Close',
    'sheet.avoir.cancel': 'Cancel',
    'sheet.avoir.quantity': 'Quantity',
    'sheet.avoir.unknownError': 'Unknown error',
    'sheet.avoir.equipped': 'Equipped',
    'sheet.avoir.unequipped': 'Unequipped',
    'sheet.avoir.equip': 'Equip',
    'sheet.avoir.unequip': 'Unequip',
    'sheet.avoir.attuned': 'Attuned',
    'sheet.avoir.add.addedTitle': 'Item added',
    'sheet.avoir.add.addedSub': '{qty} × {name}',
    'sheet.avoir.add.failTitle': 'Cannot add',
    'sheet.avoir.add.browseTitle': 'Add an item',
    'sheet.avoir.add.customTitle': 'Create a custom item',
    'sheet.avoir.add.browseSubtitle': '{n} items + {m} magic',
    'sheet.avoir.add.customSubtitle': 'Personal reference',
    'sheet.avoir.add.searchPlaceholder': 'Search for an item…',
    'sheet.avoir.add.noMatch': 'No matching item.',
    'sheet.avoir.add.customCta': '+ Custom',
    'sheet.avoir.add.confirm': 'Add',
    'sheet.avoir.coin.cu': 'cp',
    'sheet.avoir.coin.ar': 'sp',
    'sheet.avoir.coin.el': 'ep',
    'sheet.avoir.coin.or': 'gp',
    'sheet.avoir.coin.pl': 'pp',
    'sheet.avoir.weight.title': 'Carried weight',
    'sheet.avoir.weight.normal': 'Normal load',
    'sheet.avoir.weight.encumbered': 'Encumbered',
    'sheet.avoir.weight.heavilyEncumbered': 'Heavily encumbered',
    'sheet.avoir.coins.title': 'Purse',
    'sheet.avoir.coins.purseToast': 'Purse — {coin}',
    'sheet.avoir.coins.updated': 'Updated',
    'sheet.avoir.coins.editAria': 'Edit {coin} coins',
    'sheet.avoir.coins.totalValue': 'Total value ≈ {gp} gp',
    'sheet.avoir.inv.title': 'Inventory',
    'sheet.avoir.inv.addCta': '+ Item',
    'sheet.avoir.inv.searchPlaceholder': 'Search…',
    'sheet.avoir.inv.empty': 'Empty inventory. Tap “+ Item” to add a first item.',
    'sheet.avoir.inv.noMatchQuery': 'No item matches “{query}”.',
    'sheet.avoir.inv.unresolved': 'Unresolved item — check the database.',
    'sheet.avoir.inv.notFound': '(not found) {id}',
    'sheet.avoir.inv.acMeta': 'AC {ac}',
    'sheet.avoir.inv.acDexMeta': ' + DEX max {n}',
    'sheet.avoir.group.weapon': 'Weapons',
    'sheet.avoir.group.armor': 'Armor & shields',
    'sheet.avoir.group.tool': 'Tools',
    'sheet.avoir.group.pack': 'Bags & kits',
    'sheet.avoir.group.gear': 'Gear',
    'sheet.avoir.group.magic': 'Magic items',
    'sheet.avoir.group.misc': 'Misc',
    'sheet.avoir.group.unknown': 'Unknown',
    'sheet.avoir.detail.removed': 'Item removed',
    'sheet.avoir.detail.attuneLimitTitle': 'Attunement limit',
    'sheet.avoir.detail.attuneLimitSub': 'Up to {n} attuned items at once.',
    'sheet.avoir.detail.linkBroken': 'Attunement broken',
    'sheet.avoir.detail.linkEstablished': 'Attunement set',
    'sheet.avoir.detail.unresolvedItem': 'Unresolved item',
    'sheet.avoir.detail.weight': 'Weight',
    'sheet.avoir.detail.cost': 'Cost',
    'sheet.avoir.detail.damage': 'Damage',
    'sheet.avoir.detail.ac': 'AC',
    'sheet.avoir.detail.acDex': ' + DEX (max {n})',
    'sheet.avoir.detail.noDescription': 'No detailed description for this item.',
    'sheet.avoir.detail.decreaseQty': 'Decrease quantity',
    'sheet.avoir.detail.increaseQty': 'Increase quantity',
    'sheet.avoir.detail.notes': 'Notes',
    'sheet.avoir.detail.notesPlaceholder': 'Origin, history, engraved runes…',
    'sheet.avoir.detail.unlink': 'Unattune',
    'sheet.avoir.detail.link': 'Attune',
    'sheet.avoir.detail.confirmRemove': 'Confirm removal',
    'sheet.avoir.detail.remove': 'Remove',
    'sheet.avoir.customForm.invalidSchema': 'Invalid schema: {errors}',
    'sheet.avoir.customForm.created': 'Custom item created',
    'sheet.avoir.customForm.failTitle': 'Cannot create',
    'sheet.avoir.customForm.name': 'Name',
    'sheet.avoir.customForm.category': 'Category',
    'sheet.avoir.customForm.weight': 'Weight (kg)',
    'sheet.avoir.customForm.description': 'Description (optional)',
    'sheet.avoir.customForm.descPlaceholder': 'Notes, properties, history…',
    'sheet.avoir.customForm.submit': 'Create & add',
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
    'customContent.list.export': 'Export',
    'customContent.list.exportTip': 'Downloads this pack as JSON, re-importable as is.',
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
    'customContent.category.magic-items': 'Magic items',
    'customContent.category.monsters': 'Monsters',
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
    // Magic item — pack editor (directive 2026-06-27)
    'customContent.editor.magicItems.add': 'Add a magic item',
    'customContent.editor.magicItems.empty': 'No magic item added yet.',
    'customContent.editor.magicItems.remove': 'Remove',
    'customContent.editor.magicItemForm.title': 'New magic item',
    'customContent.editor.magicItemForm.id': 'Identifier',
    'customContent.editor.magicItemForm.idHelper':
      'Unique lowercase slug (e.g. flame-tongue).',
    'customContent.editor.magicItemForm.nameFr': 'Name (FR)',
    'customContent.editor.magicItemForm.nameEn': 'Name (EN, optional)',
    'customContent.editor.magicItemForm.category': 'Category',
    'customContent.editor.magicItemForm.categoryPlaceholder': 'Pick a category…',
    'customContent.editor.magicItemForm.rarity': 'Rarity',
    'customContent.editor.magicItemForm.rarityPlaceholder': 'Pick a rarity…',
    'customContent.editor.magicItemForm.attunement': 'Requires attunement',
    'customContent.editor.magicItemForm.attunementHelper':
      'Checked: the item must be attuned before its effects apply.',
    'customContent.editor.magicItemForm.magicDescriptionFr': 'Magic effect (FR)',
    'customContent.editor.magicItemForm.magicDescriptionEn':
      'Magic effect (EN, optional)',
    'customContent.editor.magicItemForm.magicDescriptionHelper':
      'Describe the item’s magic powers (bonuses, charges, spells…).',
    'customContent.editor.magicItemForm.hasDescription': 'Add a flavor description',
    'customContent.editor.magicItemForm.hasDescriptionHelper':
      'Non-mechanical text (appearance, lore) — optional.',
    'customContent.editor.magicItemForm.descriptionFr': 'Description (FR)',
    'customContent.editor.magicItemForm.descriptionEn':
      'Description (EN, optional)',
    'customContent.editor.magicItemForm.cancel': 'Cancel',
    'customContent.editor.magicItemForm.confirm': 'Confirm magic item',
    'customContent.editor.magicItemForm.error.idRequired':
      'The identifier is required.',
    'customContent.editor.magicItemForm.error.idFormat':
      'Lowercase slug, digits and dashes only.',
    'customContent.editor.magicItemForm.error.nameFrRequired':
      'The French name is required.',
    'customContent.editor.magicItemForm.error.categoryRequired':
      'Pick a category.',
    'customContent.editor.magicItemForm.error.rarityRequired': 'Pick a rarity.',
    'customContent.editor.magicItemForm.error.magicDescriptionRequired':
      'The magic effect is required.',
    // Monster — pack editor (directive 2026-06-27)
    'customContent.editor.monsters.add': 'Add a monster',
    'customContent.editor.monsters.empty': 'No monster added yet.',
    'customContent.editor.monsters.remove': 'Remove',
    'customContent.editor.monsterForm.title': 'New monster',
    'customContent.editor.monsterForm.id': 'Identifier',
    'customContent.editor.monsterForm.idHelper':
      'Unique lowercase slug (e.g. goblin-scout).',
    'customContent.editor.monsterForm.nameFr': 'Name (FR)',
    'customContent.editor.monsterForm.nameEn': 'Name (EN, optional)',
    'customContent.editor.monsterForm.size': 'Size',
    'customContent.editor.monsterForm.type': 'Type',
    'customContent.editor.monsterForm.typeHelper':
      'Creature category (e.g. humanoid, beast, undead).',
    'customContent.editor.monsterForm.alignmentFr': 'Alignment (FR)',
    'customContent.editor.monsterForm.alignmentEn': 'Alignment (EN, optional)',
    'customContent.editor.monsterForm.ac': 'Armor class',
    'customContent.editor.monsterForm.hpAvg': 'Hit points (average)',
    'customContent.editor.monsterForm.hpFormula': 'HP formula',
    'customContent.editor.monsterForm.speedLegend': 'Speeds (in feet)',
    'customContent.editor.monsterForm.speedWalk': 'Walk',
    'customContent.editor.monsterForm.speedFly': 'Fly',
    'customContent.editor.monsterForm.speedSwim': 'Swim',
    'customContent.editor.monsterForm.speedClimb': 'Climb',
    'customContent.editor.monsterForm.speedBurrow': 'Burrow',
    'customContent.editor.monsterForm.abilitiesLegend': 'Ability scores',
    'customContent.editor.monsterForm.sensesLegend': 'Senses (in feet)',
    'customContent.editor.monsterForm.passivePerception': 'Passive Perception',
    'customContent.editor.monsterForm.darkvision': 'Darkvision',
    'customContent.editor.monsterForm.blindsight': 'Blindsight',
    'customContent.editor.monsterForm.tremorsense': 'Tremorsense',
    'customContent.editor.monsterForm.truesight': 'Truesight',
    'customContent.editor.monsterForm.cr': 'Challenge rating',
    'customContent.editor.monsterForm.crHelper':
      'CR — fractional values allowed (0.125 = 1/8, 0.5 = 1/2).',
    'customContent.editor.monsterForm.xp': 'Experience points',
    'customContent.editor.monsterForm.resistances': 'Damage resistances',
    'customContent.editor.monsterForm.immunities': 'Damage immunities',
    'customContent.editor.monsterForm.vulnerabilities': 'Vulnerabilities',
    'customContent.editor.monsterForm.conditionImmunities':
      'Condition immunities',
    'customContent.editor.monsterForm.languages': 'Languages',
    'customContent.editor.monsterForm.listHelper':
      'Add each entry then confirm — click a tag to remove it.',
    'customContent.editor.monsterForm.listEmpty': 'No entry.',
    'customContent.editor.monsterForm.listAdd': 'Add',
    'customContent.editor.monsterForm.traits': 'Traits',
    'customContent.editor.monsterForm.traitAdd': 'Add a trait',
    'customContent.editor.monsterForm.actions': 'Actions',
    'customContent.editor.monsterForm.actionAdd': 'Add an action',
    'customContent.editor.monsterForm.reactions': 'Reactions',
    'customContent.editor.monsterForm.reactionAdd': 'Add a reaction',
    'customContent.editor.monsterForm.legendaryActions': 'Legendary actions',
    'customContent.editor.monsterForm.legendaryAdd': 'Add a legendary action',
    'customContent.editor.monsterForm.namedEmpty': 'No entry.',
    'customContent.editor.monsterForm.namedRemove': 'Remove',
    'customContent.editor.monsterForm.entryNameFr': 'Name (FR)',
    'customContent.editor.monsterForm.entryNameEn': 'Name (EN, optional)',
    'customContent.editor.monsterForm.entryDescFr': 'Description (FR)',
    'customContent.editor.monsterForm.entryDescEn': 'Description (EN, optional)',
    'customContent.editor.monsterForm.cancel': 'Cancel',
    'customContent.editor.monsterForm.confirm': 'Confirm monster',
    'customContent.editor.monsterForm.error.idRequired':
      'The identifier is required.',
    'customContent.editor.monsterForm.error.idFormat':
      'Lowercase slug, digits and dashes only.',
    'customContent.editor.monsterForm.error.nameFrRequired':
      'The French name is required.',
    'customContent.editor.monsterForm.error.typeRequired':
      'The type is required.',
    'customContent.editor.monsterForm.error.alignmentRequired':
      'The French alignment is required.',
    'customContent.editor.monsterForm.error.hpFormulaRequired':
      'The HP formula is required.',
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
    // Edit mode (JALON 3C.10)
    'customContent.editor.editMode.title': 'Edit pack',
    'customContent.editor.editMode.subtitle':
      'Edit an imported pack. Save will overwrite the current version.',
    'customContent.editor.editMode.notFound':
      'Pack not found. It may have been deleted.',
    'customContent.editor.editMode.errorTitle': 'Failed to load pack',
    'customContent.editor.editMode.back': 'Back to list',
    'customContent.editor.meta.idHelperEdit':
      'Identifier locked: to rename, export then re-import under a new id.',
    'customContent.editor.entityRow.edit': 'Edit',
    'customContent.list.edit': 'Edit',
    // Explicit tooltips — character sheet
    'sheet.tip.editPreparation': 'Edit your list of prepared spells.',
    'sheet.tip.openSpellDetail': 'Open the spell’s detailed entry.',
    'sheet.tip.chooseSlotLevel': 'Choose the spell slot level used.',
    'sheet.tip.spellAttackRoll': 'Roll a d20 plus your spell attack bonus.',
    'sheet.tip.castSpell': 'Cast the spell and spend the required resource.',
    'sheet.tip.restoreAllSlots': 'Restore all spell slots.',
    'sheet.tip.restorePactSlots': 'Restore all pact slots.',
    'sheet.tip.consumeSlot': 'Spend this slot.',
    'sheet.tip.restoreSlot': 'Restore this slot.',
    'sheet.tip.openDetail': 'Open the details for this element.',
    'sheet.tip.toggleInspiration': 'Grant or remove the character’s inspiration.',
    'sheet.tip.rollSave': 'Roll a saving throw for this ability.',
    'sheet.tip.rollSkill': 'Roll a check for this skill.',
    'sheet.tip.closeModal': 'Close this window.',
    'sheet.tip.decrement': 'Decrease the quantity by one.',
    'sheet.tip.increment': 'Increase the quantity by one.',
    'sheet.tip.toggleEquip': 'Equip or unequip this item.',
    'sheet.tip.toggleAttune': 'Attune this magic item to your character.',
    'sheet.tip.removeItem': 'Remove this item from the inventory.',
    'sheet.tip.editCoin': 'Edit the number of coins.',
    'sheet.tip.addItem': 'Add an item to your inventory.',
    'sheet.tip.createCustomItem': 'Create a custom homebrew item.',
    // Explicit tooltips — campaigns
    'campaigns.tip.viewStatBlock': 'View the creature’s combat stat block.',
    'campaigns.tip.applyDamage': 'Remove this many hit points.',
    'campaigns.tip.applyHeal': 'Restore this many hit points.',
    'campaigns.tip.quickDamage': 'Deal this much damage in one tap.',
    'campaigns.tip.quickHeal': 'Heal this amount in one tap.',
    'campaigns.tip.grantTempHp': 'Grant this amount as temporary hit points (the better value wins).',
    'campaigns.tip.customCondition': 'Apply a condition invented by the table.',
    'campaigns.tip.saveNote': 'Save this note on the combatant.',
    'campaigns.tip.conditionAdd': 'Apply this condition to the creature.',
    'campaigns.tip.conditionRemove': 'Remove this condition from the creature.',
    'campaigns.tip.rollInit': 'Roll initiative for every combatant.',
    'campaigns.tip.startCombat': 'Start combat and lock the turn order.',
    'campaigns.tip.endTurn': 'Move to the next combatant.',
    'campaigns.tip.endCombat': 'End combat and choose its outcome.',
    'campaigns.tip.reroll': 'Reroll this combatant’s initiative.',
    'campaigns.tip.controlParticipant': 'Adjust its hit points and conditions.',
    'campaigns.tip.previousTurn': 'Step back to the previous combatant — something was missed.',
    'campaigns.tip.abortCombat': 'Close with no outcome: this fight never ended.',
    'campaigns.tip.reopenCombat': 'Put this fight back in progress, where it left off.',
    'campaigns.tip.manageEncounter': 'Rename or delete this encounter.',
    'campaigns.tip.addParticipant': 'Bring a combatant into an encounter already under way.',
    'campaigns.tip.editParticipant': 'Fix its name, hit points or initiative.',
    'campaigns.tip.removeParticipant': 'Take it out of the encounter — it leaves the turn order.',
    'campaigns.tip.openJournal': 'Open the campaign journal.',
    'campaigns.tip.openHandouts': 'Open the documents shared with the table.',
    'campaigns.tip.openNpcs': 'Open the directory of non-player characters.',
    'campaigns.tip.openSessions': 'Open the list of game sessions.',
    'campaigns.tip.openEncounters': 'Open the list of combat encounters.',
    'campaigns.tip.openMaps': 'Open the campaign’s map mode.',
    'campaigns.tip.viewMaps':
      'View the campaign maps, exactly as the GM projects them.',
    'campaigns.tip.openSettings':
      'Edit the table’s name, dice mode and 5e variants.',
    'campaigns.tip.promoteGm': 'Grant this player full game master authority.',
    'campaigns.tip.copyInviteCode': 'Copy the invite code to the clipboard.',
    'campaigns.tip.shareInviteLink':
      'Share an invite link — the code is already prefilled.',
    'campaigns.tip.linkCharacter': 'Choose the character you play here.',
    'campaigns.tip.openOwnSheet': 'View your character sheet.',
    'campaigns.tip.createCharacter':
      'Create a new character, automatically linked to this campaign.',
    'campaigns.tip.editNpc': 'Edit this non-player character’s sheet.',
    'campaigns.tip.deleteNpc': 'Permanently delete this non-player character.',
    'campaigns.tip.duplicateNpc':
      'Copy this non-player character into another campaign you run.',
    'campaigns.tip.editRelations': 'Edit the ties with player characters.',
    'campaigns.tip.archiveHandout': 'Archive this document and hide it from players.',
    'campaigns.tip.startSession': 'Start the session and log play.',
    'campaigns.tip.endSession': 'End the session and compile the journal.',
    'campaigns.tip.applyHandoff': 'Choose the target that takes this damage.',
    'campaigns.tip.handoffTarget': 'Apply the damage to this creature.',
    'campaigns.tip.removeMonsterRow': 'Remove this monster from the encounter.',
    'campaigns.tip.fromBestiary': 'Prefill a monster from the bestiary.',
    'campaigns.tip.demoteGm':
      'Revoke their GM authority. They stay a player at the table.',
    'campaigns.tip.kickMember':
      'Remove this player from the campaign. Their sheet stays theirs.',
    'campaigns.tip.rotateInviteCode':
      'Revoke the current code and generate a new one.',
    // Explicit tooltips — map
    'map.tip.placeAoe': 'Pick this area-of-effect shape to place.',
    'map.tip.rotateAoeCcw': 'Rotate the area 15° counter-clockwise.',
    'map.tip.rotateAoeCw': 'Rotate the area 15° clockwise.',
    'map.tip.shrinkAoe': 'Shrink the area by one square.',
    'map.tip.growAoe': 'Grow the area by one square.',
    'map.tip.sphereNoRotation': 'A sphere has no orientation.',
    'map.tip.deleteAoe': 'Delete this area-of-effect.',
    'map.tip.removeFromInitiative': 'Remove this combatant from initiative.',
    'map.tip.addMonster': 'Place a bestiary monster on the map.',
    'map.tip.snapToGrid': 'Snap tokens to the center of their square.',
    'map.tip.snapNeedsGrid': 'Show the grid first to snap tokens.',
    'map.tip.toggleGrid': 'Show or hide the map grid.',
    'map.tip.toggleFog': 'Turn the fog of war on or off.',
    'map.tip.toggleLos': 'Turn line of sight on or off (walls block vision).',
    'map.tip.viewAsPlayer': 'See the map as the table sees it, before revealing.',
    'map.tip.toggleLighting': 'Show or hide the glow of light sources.',
    'map.tip.toggleMeasure': 'Measure a distance in meters on the map.',
    'map.tip.deleteMap': 'Permanently delete this map.',
    // Map screens — common + cloud + import + TV
    'map.common.loading': 'Loading…',
    'map.common.loadingMap': 'Loading the map…',
    'map.common.errorPrefix': 'Error: ',
    'map.common.missingCid':
      'Invalid URL: the campaign identifier (`cid`) is missing.',
    'map.common.invalidSlug':
      'Invalid identifier (kebab-case slug: lowercase letters, digits, hyphens).',
    'map.common.nameRequired': 'A name is required.',
    'map.common.slugLabel': 'Identifier (slug)',
    'map.common.nameLabel': 'Name',
    'map.common.deletePrefix': 'Delete',
    'map.common.backToCampaign': 'Campaign',
    'map.badge.prototype': 'Prototype — not production',
    'map.tv.missingParams': 'Invalid URL: `cid` or `mid` is missing.',
    'map.tv.notFound': 'Map not found.',
    'map.tv.back': 'Back',
    'map.cloud.signedOut': 'Sign in to manage maps.',
    'map.cloud.title': 'Maps',
    'map.cloud.campaignPrefix': 'Campaign: ',
    'map.cloud.importLink': 'Import a .dd2vtt map',
    'map.cloud.ensureErrorPrefix': 'Campaign initialization: ',
    'map.cloud.createSection': 'Create a map',
    'map.cloud.newMap': 'New map',
    'map.cloud.slugPlaceholder': 'dawn-dungeon',
    'map.cloud.namePlaceholder': 'Dawn Dungeon',
    'map.cloud.creating': 'Creating…',
    'map.cloud.create': 'Create',
    'map.cloud.loadErrorPrefix': 'Loading error: ',
    'map.cloud.loadingMaps': 'Loading maps…',
    'map.cloud.empty': 'No maps for this campaign. Create one above.',
    'map.cloud.emptyMember':
      'The GM has not prepared a map for this campaign yet.',
    'map.cloud.memberIntro':
      'These maps are read-only: you see exactly what the GM projects on the table.',
    'map.zoom.inAria': 'Zoom in on the map',
    'map.zoom.outAria': 'Zoom out of the map',
    'map.zoom.reset': 'Reframe',
    'map.cloud.listAria': 'Map list',
    'map.cloud.delete': 'Del.',
    'map.import.signedOut': 'Sign in to import a map.',
    'map.import.parseFailedPrefix': 'Could not read file: ',
    'map.import.back': 'Maps',
    'map.import.title': 'Import a map',
    'map.import.badge': '.dd2vtt — Dungeon Alchemist',
    'map.import.introBefore': 'Select a ',
    'map.import.introAfter':
      ' file exported by Dungeon Alchemist. Walls, lights and the grid are imported and synchronized; the background image stays stored locally on this device (cross-device sync will arrive with Firebase Storage).',
    'map.import.chooseFile': 'Choose a .dd2vtt file',
    'map.import.statDimensions': 'Dimensions',
    'map.import.statWalls': 'Walls',
    'map.import.statLights': 'Lights',
    'map.import.statImage': 'Image',
    'map.import.squaresSuffix': 'squares',
    'map.import.verticesSuffix': 'vertices',
    'map.import.imageIncluded': 'Included',
    'map.import.imageAbsent': 'Absent',
    'map.import.preview': 'Preview',
    'map.import.saveSection': 'Save the map',
    'map.import.submitting': 'Importing…',
    'map.import.submit': 'Import',
    // Map screen — plain image import (2nd import tab)
    'map.import.tabDd2vtt': 'Dungeon Alchemist file',
    'map.import.tabImage': 'Battlemap image',
    'map.import.imageIntro':
      'An image is enough: any floor plan found online becomes a playable map. No walls or lights are inferred — fog and grid are set inside the map afterwards.',
    'map.import.chooseImage': 'Choose an image',
    'map.import.imageProcessing': 'Optimising…',
    'map.import.imageTooLarge':
      'This image is still too heavy after optimisation. Shrink it before importing.',
    'map.import.imageFailed': 'This image could not be read.',
    'map.import.statWeight': 'Optimised weight',
    'map.import.statScale': 'Starting scale',
    'map.import.imageHint':
      'The image stays on this device. For the table to see it, set a public URL in the map settings.',
    // Map screen — settings of an existing map (map-settings-modal)
    'map.settings.closeLabel': 'Close settings',
    'map.settings.title': 'Map settings',
    'map.settings.gridSizeLabel': 'Square size on screen (pixels)',
    'map.settings.gridSizeHelp':
      "Adjust until the grid lines up with the image's own grid.",
    'map.settings.scaleLabel': 'One square represents (metres)',
    'map.settings.scaleEchoPrefix': 'Stored as ',
    'map.settings.scaleInvalid': 'Enter a distance in metres, for example 1.5.',
    'map.settings.imageUrlLabel': 'Background image URL',
    'map.settings.imageUrlPlaceholder': 'https://…',
    'map.settings.imageUrlHelp':
      'An imported image stays local to this device. A public URL also shows up for players and on the table screen.',
    'map.settings.save': 'Save settings',
    'map.live.settingsButton': 'Settings',
    'map.tip.openSettings':
      'Rename the map, realign the grid, change the scale or the background image.',
    // Map screen — token editor + bestiary picker
    'map.token.editTitle': 'Edit the token',
    'map.token.closeLabel': 'Close token editing',
    'map.token.portraitSection': 'Portrait',
    'map.token.portraitAltPrefix': 'Portrait of ',
    'map.token.portraitAltFallback': 'this token',
    'map.token.imageProcessing': 'Processing…',
    'map.token.imageReplace': 'Replace',
    'map.token.imageAdd': 'Add an image',
    'map.token.imageRemove': 'Remove image',
    'map.token.imageError': 'Failed to load the image.',
    'map.token.imageHelp':
      'Cropped to a circle and optimized, then synchronized across all screens (TV view, other devices).',
    'map.token.kindSection': 'Token type',
    'map.token.colorSection': 'Color',
    'map.token.colorGroupAria': 'Token color',
    'map.token.visionSection': 'Vision range',
    'map.token.visionGroupAria': 'Token vision range',
    'map.token.visionNone': 'None',
    'map.token.visionHelp':
      'Radius of fog cleared around the token when line of sight is active.',
    'map.token.lightSection': 'Carried light',
    'map.token.lightGroupAria': 'Light carried by the token',
    'map.token.lightNoneSub': 'Carries nothing',
    'map.token.lightRadiusPrefix': 'Radius ',
    'map.token.lightHelp':
      'The light follows the token as it moves (applied immediately).',
    'map.token.save': 'Save',
    'map.token.duplicate': 'Duplicate the token',
    'map.token.delete': 'Delete this token',
    'map.token.fallbackLabel': 'Creature',
    'map.token.colorBlue': 'Blue',
    'map.token.colorRed': 'Red',
    'map.token.colorGreen': 'Green',
    'map.token.colorAmber': 'Amber',
    'map.token.colorPurple': 'Purple',
    'map.token.colorTurquoise': 'Turquoise',
    'map.token.colorPink': 'Pink',
    'map.token.colorGray': 'Gray',
    'map.token.kindPj': 'Player character',
    'map.token.kindPnj': 'NPC / monster',
    'map.token.kindMarker': 'Marker',
    'map.token.kindHintPj': 'Ally controlled by a player',
    'map.token.kindHintPnj': 'Creature controlled by the GM',
    'map.token.kindHintMarker': 'Point of interest, no vision',
    'map.token.visionNoneSub': 'No line of sight',
    'map.token.visionNormalSub': 'Normal vision',
    'map.token.visionDarkSub': 'Darkvision',
    'map.token.visionDarkExtSub': 'Extended darkvision',
    'map.token.lightNone': 'None',
    'map.token.lightCandle': 'Candle',
    'map.token.lightTorch': 'Torch',
    'map.token.lightLantern': 'Lantern',
    'map.monsterPicker.title': 'Add from the bestiary',
    'map.monsterPicker.searchPlaceholder': 'Search for a monster…',
    'map.monsterPicker.searchAria': 'Search for a monster',
    'map.monsterPicker.loading': 'Loading the bestiary…',
    'map.monsterPicker.emptyTitle': 'Your bestiary is empty.',
    'map.monsterPicker.emptyHint':
      'Import an expansion pack (monsters) from My account › Content, then come back here: your creatures will be placeable with a tap.',
    'map.monsterPicker.noMatchBefore': 'No monster matches "',
    'map.monsterPicker.noMatchAfter': '".',
    'map.monsterPicker.crPrefix': 'CR',
    // Live map screen (map-live-screen) — GM toolbar
    'map.live.signedOut': 'Sign in to manage the map.',
    'map.live.badge': 'Prototype — Firestore live',
    'map.live.metaTokenSingular': 'token',
    'map.live.metaTokenPlural': 'tokens',
    'map.live.writeErrorPrefix': 'Write refused: ',
    'map.live.portraitTooHeavy': 'Portrait too heavy to sync. Try a simpler image.',
    'map.live.fogLabel': 'Fog',
    'map.live.addFogReveal': 'Reveal at the center',
    'map.live.addFogMask': 'Mask at the center',
    'map.live.clearFog': 'Clear fog',
    'map.live.lightsLabel': 'Lights',
    'map.live.lightTooltipPrefix': 'Place a "',
    'map.live.lightTooltipMid': '" light at the center (radius ',
    'map.live.clearLights': 'Clear lights',
    'map.live.aoeLabel': 'AoE',
    'map.live.clearAoe': 'Clear AoE',
    'map.live.deleteAoe': 'Delete',
    'map.live.tokensLabel': 'Tokens',
    'map.live.addPj': '+ PC',
    'map.live.addPnj': '+ NPC',
    'map.live.addBestiary': '+ Bestiary',
    'map.live.clearTokens': 'Clear tokens',
    'map.live.tokenAbbrevPj': 'PC',
    'map.live.tokenAbbrevPnj': 'NPC',
    'map.live.tokenAbbrevMarker': '•',
    'map.live.wallsLabel': 'Walls',
    'map.live.gridToggle': 'Grid:',
    'map.live.snapToggle': 'Magnet:',
    'map.live.fogToggleLabel': 'Fog:',
    'map.live.losToggle': 'Line of sight:',
    'map.live.playerViewToggle': 'Player view:',
    'map.live.lightingToggle': 'Lighting:',
    'map.live.tvView': 'Presentation view',
    'map.live.measureLabel': 'Measure',
    'map.live.measureToggle': 'Measure:',
    'map.live.distancePrefix': 'Distance: ',
    'map.live.clearMeasure': 'Clear measure',
    'map.live.measureHint': 'Click on the map to drop points.',
    'map.light.candle': 'Candle',
    'map.light.torch': 'Torch',
    'map.light.spell': 'Light spell',
    'map.light.lantern': 'Lantern',
    'map.light.sunlight': 'Daylight',
    'map.aoe.sphere': 'Sphere',
    'map.aoe.cone': 'Cone',
    'map.aoe.line': 'Line',
    'map.aoe.cube': 'Cube',
    // Standalone map prototype (/map-proto)
    'map.proto.title': 'Map prototype',
    'map.proto.importBg': 'Import a background',
    'map.proto.hideGrid': 'Hide grid',
    'map.proto.showGrid': 'Show grid',
    'map.proto.reset': 'Reset',
    'map.proto.zoomLabel': 'zoom',
    'map.proto.fogSection': 'Fog of war',
    'map.proto.fogOn': 'Fog on',
    'map.proto.fogOff': 'Fog off',
    'map.proto.viewPlayer': 'Player view',
    'map.proto.viewDm': 'GM view',
    'map.proto.brushReveal': 'Reveal brush',
    'map.proto.brushMask': 'Eraser brush',
    'map.proto.revealAll': 'Reveal all',
    'map.proto.maskAll': 'Mask all',
    'map.proto.lightSection': 'Light',
    'map.proto.lightOn': 'Light on',
    'map.proto.lightOff': 'Light off',
    'map.proto.placeTorch': 'Place torch',
    'map.proto.tokenTorchPrefix': 'Torch',
    'map.proto.clearLights': 'Clear lights',
    'map.proto.aoeSection': 'AoE',
    'map.proto.clearAoe': 'Clear AoE',
    'map.proto.vttSection': 'VTT (prototype)',
    'map.proto.ruler': 'Ruler',
    'map.proto.clearRuler': 'Clear ruler',
    'map.proto.gridSnap': 'Grid magnet',
    'map.proto.on': 'on',
    'map.proto.off': 'off',
    'map.proto.initiative': 'Initiative',
    'map.proto.intro':
      'Import a background image, drag the tokens with the mouse (or finger on touch), wheel to zoom, drag the background to pan the view.',
    'map.proto.fogIntroPrefix': ' The fog is ',
    'map.proto.fogStateOpaque': 'opaque (player view)',
    'map.proto.fogStateTranslucent': 'translucent (GM view)',
    'map.proto.fogIntroSuffix':
      ', PCs automatically reveal around themselves; enable a brush to paint an area manually.',
    'map.proto.noPersistStrong': 'No persistence',
    'map.proto.noPersistRest': ' — refreshing resets everything.',
    'map.proto.initSeed': 'Seed from tokens',
    'map.proto.initNextTurn': 'Next turn',
    'map.proto.initReset': 'Reset',
    'map.proto.initEmpty': 'No entries. Click “Seed from tokens” to start.',
    'map.proto.hp': 'HP',
    'map.proto.removeEntryPrefix': 'Remove',
    // Explicit tooltips — wizard + level-up
    'wizard.tip.rollAbilities': 'Rolls the dice for you to generate the six scores.',
    'wizard.tip.autofillAbilities': 'Fills in the recommended ability scores for your class.',
    'wizard.tip.navPrevious': 'Goes back to the previous step.',
    'wizard.tip.navNext': 'Moves on to the next step.',
    'wizard.tip.autofillSpells': 'Picks spells suited to the class for you.',
    'wizard.tip.recapEdit': 'Returns to this step to edit it.',
    'wizard.tip.removeClass': 'Removes this class from the character.',
    'wizard.tip.addClass': 'Adds a second class to the character.',
    'wizard.tip.autofillEquipment': 'Picks suitable starting equipment for you.',
    'wizard.tip.autofillSkills': 'Picks skills suited to the class for you.',
    'levelUp.tip.levelUp': 'Gains a level in your main class.',
    'levelUp.tip.addClass': 'Learns a new class through multiclassing.',
    'levelUp.tip.hpAverage': 'Fixed hit point gain, no randomness.',
    'levelUp.tip.hpRoll': 'Random hit point gain, rolled with the die.',
    'levelUp.button.levelUp': 'Level up',
    'levelUp.button.levelUpAria': 'Level up to level {level}',
    'levelUp.button.addClass': 'Add a class',
    'levelUp.button.addClassAria': 'Add a class through multiclassing',
    // Level-up / add-class (multiclass) modal
    'levelUp.mode.levelUp': 'Level up',
    'levelUp.mode.addClass': 'Add a class',
    'levelUp.heading.levelUp': '{class} — Level {from} → {to}',
    'levelUp.heading.addClassPrompt': 'Choose your new class',
    'levelUp.heading.addClassTarget': '{class} — Level 1',
    'levelUp.stepIndicator.aria': 'Level up progress',
    'levelUp.stepIndicator.label': 'Step {n} / {total}',
    'levelUp.empty': 'No choice to make — confirm the level up.',
    'levelUp.nav.previous': 'Previous',
    'levelUp.nav.next': 'Next',
    'levelUp.nav.confirm': 'Confirm',
    'levelUp.nav.applying': 'Applying…',
    'levelUp.hp.title': 'Hit points',
    'levelUp.hp.intro':
      'Choose how to determine your HP gain for this level. The average is the recommended default.',
    'levelUp.hp.average': 'Average',
    'levelUp.hp.gain': '+{n} HP',
    'levelUp.hp.roll': 'Roll the die',
    'levelUp.hp.diePlusMod': '{die} + {mod}',
    'levelUp.subclass.title': 'Subclass',
    'levelUp.subclass.intro':
      'Choose the specialized path of your {class}. This choice applies from this level.',
    'levelUp.subclass.loading': 'Loading subclasses…',
    'levelUp.subclass.none': 'No subclass available for this class.',
    'levelUp.subclass.listAria': 'Available subclasses',
    'levelUp.asi.titleEpic': 'Ability score improvement or epic boon',
    'levelUp.asi.title': 'Ability score improvement or feat',
    'levelUp.asi.introEpic':
      'At this level you can either distribute 2 ability score points (+2 to one ability or +1/+1 to two), or take an epic boon instead.',
    'levelUp.asi.intro':
      'You can either distribute 2 ability score points (+2 to one ability or +1/+1 to two), or take a general feat instead.',
    'levelUp.asi.typeAria': 'Bonus type',
    'levelUp.asi.improvement': 'Improvement',
    'levelUp.asi.feat': 'Feat',
    'levelUp.asi.distributionLegend': 'Distribution mode',
    'levelUp.asi.plusTwo': '+2 to one ability',
    'levelUp.asi.plusOneOne': '+1 to two abilities',
    'levelUp.asi.primary': 'Primary ability',
    'levelUp.asi.secondary': 'Secondary ability',
    'levelUp.feat.epic': 'Epic boon',
    'levelUp.feat.general': 'General feat',
    'levelUp.feat.loading': 'Loading feats…',
    'levelUp.feat.placeholder': 'Choose a feat…',
    'levelUp.feat.blockedTitle': 'Prerequisite not met — {reasons}',
    'levelUp.prereq.level': 'Level {n}+ required',
    'levelUp.prereq.ability': '{ability} {n}+ required',
    'levelUp.prereq.spellcasting': 'Spellcasting ability required',
    'levelUp.prereq.classFeature': 'Class feature “{feature}” required',
    'levelUp.pick.cantripsLabel': 'Cantrips',
    'levelUp.pick.cantripsHelp': 'Choose {count} additional cantrip(s).',
    'levelUp.pick.spellsLabel': 'Spells',
    'levelUp.pick.spellsHelp': 'Choose {count} additional spell(s) (level ≤ {maxLevel}).',
    'levelUp.pick.invocationsLabel': 'Eldritch invocations',
    'levelUp.pick.invocationsHelp':
      'Choose {count} additional eldritch invocation(s).',
    'levelUp.pick.selectedCount': '{n} / {max} selected',
    'levelUp.pick.loading': 'Loading…',
    'levelUp.pick.none': 'No option available for this level.',
    'levelUp.addClass.ownedReason': 'Class already owned',
    'levelUp.addClass.pickTitle': 'Class to add',
    'levelUp.addClass.pickIntro':
      'Choose the class your character wishes to learn. Greyed-out classes are unavailable — hover to see why.',
    'levelUp.addClass.blockedTitle': 'Unavailable — {reason}',
    'levelUp.addClass.selectFirst': 'Select a class at the previous step first.',
    'levelUp.addClass.defNotFound': 'Definition not found for “{id}”.',
    'levelUp.addClass.subChoicesTitle': 'Level 1 sub-choices',
    'levelUp.addClass.noSubChoices':
      '{class} has no mandatory sub-choice at level 1 — you can confirm directly.',
    'levelUp.addClass.subChoicesTitleClass': 'Level 1 sub-choices — {class}',
    'levelUp.addClass.subChoicesIntro':
      'Select the level 1 options imposed by the class.',
    'levelUp.addClass.divineOrder': 'Divine order',
    'levelUp.addClass.primalOrder': 'Primal order',
    'levelUp.addClass.fightingStyle': 'Fighting style',
    'levelUp.addClass.weaponMasteryLegend': 'Weapon masteries ({count})',
    'levelUp.addClass.weaponMasteryHelper':
      'Select {count} weapons eligible for SRD 5.2.1 mastery.',
    'levelUp.addClass.weaponMasterySummary': 'Mastery · {property}',
    'levelUp.addClass.invocationLegend': 'Eldritch invocation (1)',
    'levelUp.addClass.invocationHelper':
      'Choose your initial eldritch invocation. Pact of the Tome / Blade will expose their sub-choices in a future iteration.',
    'levelUp.addClass.spellbookLegend': 'Spellbook spells (6 level 1 spells)',
    'levelUp.addClass.spellbookHelper':
      'Select 6 Wizard level 1 spells to inscribe in your starting spellbook.',
    'levelUp.addClass.spellSchoolSummary': 'School · {school}',
    'levelUp.addClass.upcomingBadge': 'Coming soon',
    'levelUp.addClass.upcomingBody':
      'conditional sub-choices (Rogue Expertise, Warlock Pact of the Tome / Blade) will be wired in a future iteration. Confirm stays blocked if you select a pact invocation that requires these sub-choices.',
    'levelUp.addClass.missingHint':
      'Still {n} sub-choice(s) to complete before confirming.',
    // Explicit tooltips — radial menu, dice, journal, DM tools
    'radialMenu.tip.fab': 'Open the character action menu.',
    'radialMenu.tip.back': 'Go back to the previous menu.',
    'radialMenu.tip.close': 'Close the menu.',
    'dice.tip.closeHistory': 'Close the roll history.',
    'dice.history.title': 'Roll history',
    'dice.options.bonus': 'One-off bonus',
    'dice.options.bonusAria': 'One-off bonus applied to this roll',
    'dice.options.useInspiration': 'Spend inspiration',
    'dice.options.inspirationNote':
      'Inspiration grants advantage and will be spent.',
    'dice.options.title': 'How to roll',
    'dice.options.aria': 'Options for the {label} roll',
    'dice.free.title': 'Free roll',
    'dice.free.aria': 'Roll a free dice formula',
    'dice.free.label': 'Formula',
    'dice.free.placeholder': '2d10+3',
    'dice.free.hint': 'Examples: 4d6 · 2d10+3 · 1d20-1d4 · 2d20kh1',
    'dice.free.invalid': 'Unreadable formula.',
    'dice.free.submit': 'Roll',
    'dice.free.cancel': 'Cancel',
    'dice.free.rollLabel': 'Free roll',
    'sheet.fab.freeRoll': 'Free roll',
    // Physical-roll modal (plan 12.5)
    'dice.physical.header': 'Physical mode — enter your dice',
    'dice.physical.rollPrompt': 'Roll {dice}',
    'dice.physical.withAdvantage': ' · with advantage',
    'dice.physical.withDisadvantage': ' · with disadvantage',
    'dice.physical.kept': 'Kept',
    'dice.physical.faceAria': 'd{sides} face number {n}',
    'dice.physical.total': 'Total',
    'dice.physical.crit': 'Critical success',
    'dice.physical.fumble': 'Critical failure',
    'dice.physical.passTip': 'Discard this roll without recording anything.',
    'dice.physical.pass': 'Skip',
    'dice.physical.validateTip': 'Confirm the entered faces and compute the total.',
    'dice.physical.validate': 'Confirm',
    'dice.hitMiss.eyebrow': 'Physical mode — attack resolution',
    'dice.hitMiss.question': 'Does your total beat the target’s AC?',
    'dice.hitMiss.miss': 'Miss',
    'dice.hitMiss.hit': 'Hit',
    'dice.hitMiss.missTip': 'The attack misses: your total does not reach the target.',
    'dice.hitMiss.hitTip': 'The attack hits: your total meets or beats the target.',
    'dice.history.closeLabel': 'Close history',
    'dice.history.empty':
      'No rolls recorded yet. Try an initiative or an ability check.',
    'dice.history.modeSaveError': 'Dice mode not saved',
    'dice.history.modeSaveErrorSub': 'Firestore error',
    'dm.tip.advNormal': 'Normal roll: a single d20.',
    'dm.tip.advAdvantage': 'Advantage: roll two d20, keep the highest.',
    'dm.tip.advDisadvantage': 'Disadvantage: roll two d20, keep the lowest.',
    'dm.tip.secretRoll': 'Roll the secret d20 with the modifier.',
    'journal.tip.export': 'Download the full journal as a Markdown file.',
    'journal.tip.exportSession':
      'Download this session alone — enough to pass on to an absent player.',
    'journal.tip.compile': 'Generate the session narrative from the events.',
    'journal.tip.edit': 'Edit the narrative by hand.',
    'journal.tip.recompile': 'Regenerate the narrative from the events.',
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
