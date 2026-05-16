# Plan 17 — ABANDONNÉ (fusionné dans le plan 05)

## Statut

**Plan supprimé en tant que parcours séparé. Acté 2026-05-16.**

Le plan 17 prévoyait un wizard guidé S2 qui aurait remplacé le formulaire monopage S1 (ancien plan 05). L'UAT navigateur réelle du plan 05 originel a immédiatement révélé que :

1. Le formulaire monopage avait 3 bugs structurels bloquants (`setDoc(undefined)`, sorts vides pour lanceurs, inputs blanc-sur-blanc).
2. La conception monopage n'était pas pédagogique — un débutant ne pouvait pas s'en servir.
3. Maintenir deux parcours (manuel S1 + wizard S2) = doublon de surface à entretenir + double maintenance pour les variants/multi-class/sous-classe.

**Décision Adrien (2026-05-16)** : un seul parcours de création, wizard guidé multi-step, livré en S1. Le plan 17 disparaît.

## Redirection

Le scope « wizard guidé multi-step pédagogique, multi-class, responsive desktop+mobile » vit désormais dans **[plan 05 — Wizard de création de personnage](./05-character-creation-wizard.md)**.

Cause-racine + diagnostic en **[plans/DEBT.md > D3](./DEBT.md)**.

Dette `featAtLevel1` (don au niveau 1, variant lié à campagne) transférée au plan 14 — voir **[plans/DEBT.md > D4](./DEBT.md)**.

## Pourquoi cette page existe encore

Pour ne pas casser les renvois historiques dans les autres plans, le `git log`, et `plans/00-overview.md`. Le numéro 17 reste réservé (ne pas réutiliser sur un autre plan, pour préserver la trace).
