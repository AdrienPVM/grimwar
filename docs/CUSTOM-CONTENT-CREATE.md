# Créer du contenu custom dans GrimWar

> Guide MJ — JALON 3C livré. Cette page explique comment fabriquer un **pack de contenu custom** in-app (sans toucher de JSON) puis le ré-éditer plus tard.

## Aperçu

Un pack custom est un document Firestore privé sous `users/{uid}/customContentPacks/{packId}`. Il regroupe jusqu'à 9 catégories d'entités homebrew :

- **Dons** (feats)
- **Invocations occultistes**
- **Sous-ascendances** (références une ancestry parente SRD ou custom)
- **Historiques** (backgrounds)
- **Sous-classes** (références une classe parente)
- **Sorts**
- **Objets** (armes, armures, équipement, outils)
- **Ascendances**
- **Classes**

Le pack se présente comme un seul document JSON ; le contenu y vit côté MJ pour ses campagnes et ne quitte jamais son compte (pas de partage public à ce stade).

## Créer un nouveau pack

1. Ouvre `/account/content` (le menu de navigation pointera vers cette page en S5 ; en attendant l'URL directe fait l'affaire).
2. Clique le lien **Créer un pack** au-dessus de la zone d'import.
3. Tu arrives sur l'éditeur (`/account/content/new`).

### Étape 1 — Métadonnées du pack

| Champ | Format | Notes |
|---|---|---|
| Identifiant | `kebab-case-slug` | unique sur ton compte. Utilisé comme document id Firestore — verrouillé après création |
| Nom (FR / EN) | texte libre | FR obligatoire ; EN optionnel |
| Auteur | texte libre | ton nom, ton pseudo, ce que tu veux |
| Version | `MAJOR.MINOR.PATCH` | semver simple, défaut `1.0.0` |
| Description (FR / EN) | texte libre | optionnel |

### Étape 2 — Ajouter des entités

Chaque catégorie a son bouton **Ajouter…**. Tu ouvres le formulaire dédié, tu remplis les champs, tu cliques **Ajouter**. L'entité apparaît dans la liste de la catégorie.

Quelques points spécifiques par catégorie :

- **Sous-ascendances** : nécessite de choisir une ancestry parente (parmi les ancestries SRD bundlées ou celles ajoutées au pack).
- **Sous-classes** : idem, parent class à choisir.
- **Sorts** : les composants V/S/M, l'école, le niveau, la durée et la portée sont normalisés ; les dés de dégâts sont optionnels et formatés sous forme de répéteur.
- **Objets** : la catégorie (arme/armure/équipement/outil) détermine les champs visibles (dés de dégâts pour les armes, AC base pour les armures, etc.).
- **Ascendances** : V1 couvre header + ASI + traits + options Dragon/Géant. Les sous-races qui nécessitent des slugs de sorts cross-bundle (Tieffelin, Elfe, Gnome) sont à éditer manuellement après export.
- **Classes** : V1 cible une classe homebrew simple (fondations + features L1). La table de progression L2-L20, les sous-choix L1 type Ordre divin, et les Weapon Mastery se font en JSON après export — un avertissement dédié rappelle ce périmètre dans le form.

> Tous les ids d'entité sont des **slugs kebab-case uniques au sein de leur catégorie dans le pack**. Réutiliser un id écrase l'entité précédente du pack (utile pour réimporter une version mise à jour).

### Étape 3 — Enregistrer

Le bouton **Enregistrer le pack** en bas valide le pack via le même validateur Zod que l'import par fichier (3B.4). Si la validation échoue, le panneau d'erreurs liste les champs incriminés ; corrige et ré-essaie. À la validation, le pack est écrit dans Firestore et tu reviens à la liste `/account/content`.

## Modifier un pack existant

1. Sur `/account/content`, chaque pack importé/créé a un lien **Modifier**.
2. Tu arrives sur l'éditeur en mode édition (`/account/content/edit/{packId}`).
3. Les métadonnées + les entités sont pré-remplies. L'identifiant du pack est verrouillé (impossible à éditer).
4. Pour modifier une entité : sur sa ligne, clique **Modifier** → le formulaire s'ouvre pré-rempli. Confirme avec les changements ; l'entité est mise à jour par son id (un rename de l'id crée une nouvelle entrée sans toucher l'ancienne).
5. **Enregistrer** écrase le document Firestore. Pas de versioning automatique côté serveur — pense à exporter une copie si tu veux conserver un état.

### Renommer un pack

L'identifiant de pack est verrouillé en mode édition car c'est l'id Firestore. Pour le renommer :

1. Exporte le pack (action prévue post-V1 ; pour l'instant : copier le JSON brut depuis Firestore console).
2. Édite le champ `meta.id` dans le JSON.
3. Réimporte via la zone de drop de `/account/content`.
4. Supprime l'ancien pack via le bouton **Supprimer**.

## Importer un pack JSON externe

Si tu prépares un pack à la main (ou exporté depuis un autre compte), tu peux le drop sur `/account/content`. Le validateur Zod te rendra une preview (compteurs par catégorie) avant d'importer définitivement. La structure exacte est documentée par les schémas Zod dans `src/shared/types/custom-content-pack.ts` + `src/shared/types/content.ts`.

## Liste actuelle des packs

Sous la zone de drop, la liste des packs existants pour ton compte (live via `onSnapshot`) — la même liste sert d'entrée pour Modifier et Supprimer.

## Limites V1 (ne pas confondre avec des bugs)

- **Pas d'export in-app** : pour récupérer le JSON brut, passe par la Firestore console.
- **Pas de partage public** : le pack reste sur ton compte. Partager = donner le JSON à un ami qui l'importe sur le sien.
- **Pas de validation cross-pack** : si un sort d'ascendance référence un slug qui n'existe pas dans le pack, l'erreur sort au moment où le wizard essaie de résoudre le slug (pas au save).
- **Sorts d'ascendance Tieffelin/Elfe/Gnome** : il faut éditer le JSON manuellement après export. La V1 du form d'ascendance bloque ces sous-races pour éviter une UX cassée.

## Référence technique

- Schéma de pack : `src/shared/types/custom-content-pack.ts`
- Schémas par entité : `src/shared/types/content.ts`
- Validateur d'import : `src/shared/lib/custom-content/parse-pack.ts`
- Stockage Firestore : `src/shared/lib/services/pack-storage.ts`
- Hook liste : `src/features/custom-content/use-packs.ts`
- Hook chargement édition : `src/features/custom-content/use-existing-pack.ts`
- Écran éditeur : `src/features/custom-content/pack-editor-screen.tsx`
- Forms par catégorie : `src/features/custom-content/forms/*.tsx`
