# Audit SRD 5.2.1 — Complétude du wizard de création + du contenu bundlé

> **Date** : 2026-05-17
> **Auteurs** : 4 agents de recherche dispatchés en parallèle + synthèse Claude Code.
> **Sources de vérité** : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt` (EN, source #1) + `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt` (FR, traduction officielle).
> **Statut** : constat seul, aucun code produit. Sert de base au cadrage du plan de comblage (jalon 1 = personnage L1 intégralement conforme).
> **Périmètre** : tout ce qui est imposé à un personnage **niveau 1**. Sous-classes (L3) et progression sont hors-périmètre (couverts par le plan 18 level-up).
>
> **Statut adressage 2026-05-17 (plan 13.7 livré)** :
> - Section A (sous-choix d'ascendance L1) — **adressé schéma + extraction** par plan 13.7 (`ancestrySubChoices` + `public/data/ancestries.json` enrichi). UI wizard à venir plan 13.8.
> - Section B (sous-choix de classe L1) — **adressé schéma + extraction** par plan 13.7 (sous-choix portés par `classes[]` + `public/data/classes.json` enrichi). UI wizard à venir plan 13.9.
> - Section C (tables transverses Mastery / Fighting Style / Invocations / Origin Feats) — **adressé extraction** par plan 13.7 (`feats.json` 17 entrées, `invocations.json` 28 entrées NOUVEAU, `items.json` `masteryProperty` sur 38 armes). Consommation UI : 13.8/13.9.
> - Section D.3 (spells cleanup) — **plan 13.10**.
> - Section D.4/D.5 (monsters, rules) — **hors périmètre L1**, S3 dédié.
> - Système d'import custom pour contenu hors-SRD — **plan 13.11**.

---

## TL;DR — verdicts par catégorie

| Domaine | État | Sévérité |
|---|---|---|
| Sous-choix L1 ascendances (wizard) | **8 sous-choix manquants sur 5 espèces** | CRITIQUE |
| Sous-choix L1 classes (wizard) | **12 sous-choix manquants sur 8 classes** | CRITIQUE |
| `public/data/feats.json` | **1/17 (16 feats manquants)** | CRITIQUE |
| `public/data/monsters.json` | **0/332** | CRITIQUE (bloquant S3) |
| `public/data/rules.json` | **0/~200** | CRITIQUE |
| `public/data/spells.json` | 330/333 — **21 vrais manquants + 44 sorts renommés (naming PHB 2014) + 18 sorts hors-SRD** | MOYEN |
| `public/data/magic-items.json` | 251/~258 | FAIBLE |
| `public/data/classes.json` | 12/12, mais **aucun `options[]` machine-readable sur les features L1 à sous-choix** | À enrichir |
| `public/data/ancestries.json` | 9/9, mais **traits L1 sans `options[]`** | À enrichir |
| `public/data/subancestries.json` | `[]` — **correct par design SRD** (lignages = choix internes au trait, pas sous-ascendances) | OK |
| Tous les autres (classes/subclasses count, backgrounds, conditions, items, ancestries count) | OK | OK |

---

## A — Sous-choix de création L1 par ascendance

> Source : `SRD_CC_v5.2.1.txt:7910-8198` + `FR_SRD_CC_v5.2.1.txt:9130-9469`. Section "Species Descriptions" / "Description des espèces" pp. 84-87 EN / 88-91 FR.
>
> **Note transverse** : aucune ascendance SRD 5.2.1 n'inflige de bonus de caractéristique fixe — tous les ASI viennent du Background.

### A.1 — Tableau ascendance × sous-choix

> Statut « Géré wizard ? » mis à jour 2026-05-17 après livraison plan 13.8 (commits `84101bd` form-kit + hook, `558dd63` choosers, `46e5bec` help, `844631d` validation, `9deacc6` sheet renders, `adcb8cd` e2e). Le seul reste est `Human Versatile` (Origin Feat = variante `featAtLevel1`, owner = plan 14 cf. DEBT.md > D4).

| Ascendance | Sous-choix imposé SRD | Géré wizard ? | Donnée présente ? | Note |
|---|---|---|---|---|
| **Dragonborn** | Draconic Ancestry — 10 types de dragon | **OUI** (13.8) | OUI (`options.dragonAncestries`) | Souffle rendu en mode Combat (`breath-weapon-card`) |
| Dwarf | aucun | N/A | N/A | OK |
| **Elf** | Elven Lineage (3 options) | **OUI** (13.8) | OUI (`options.elfLineages`) | Cantrips de lignage **rendu sheet OK (13.8b)** : carte `ancestry-spells-card` cliquable + `SpellList` générale avec chip « Lignage » distinct ; cast → DEBT D12 |
| Elf | Spellcasting Ability pour Elven Lineage (Int / Wis / Cha) | **OUI** (13.8) | constantes hardcodées | Sous-choix `ancestryCastingAbility` |
| Elf | Keen Senses skill (Insight / Perception / Survival) | **OUI** (13.8) | constante `ELF_KEEN_SENSES_SKILLS` | Sous-choix `ancestryExtraSkill` (3 cartes) |
| **Gnome** | Gnomish Lineage (2 options) | **OUI** (13.8) | OUI (`options.gnomeLineages`) | Cantrips **rendu sheet OK (13.8b)** : carte cliquable + `SpellList` rendue même sans classe lanceuse ; cast → DEBT D12 |
| Gnome | Spellcasting Ability pour Gnomish Lineage | **OUI** (13.8) | constantes hardcodées | Sous-choix `ancestryCastingAbility` |
| **Goliath** | Giant Ancestry — 6 options (Cloud/Fire/Frost/Hill/Stone/Storm) | **OUI** (13.8) | OUI (`options.giantAncestries`) | Carte d'effet rendue en mode Combat (`giant-ancestry-card`) ; compteur d'utilisations différé (TODO post-13.8) |
| Halfling | aucun | N/A | N/A | OK |
| **Human** | Size (Medium / Small) | **OUI** (13.8) | constante `ANCESTRY_SIZE_VALUES` | Sous-choix `ancestrySize` |
| Human | Skillful (1 skill au choix parmi 18) | **OUI** (13.8) | OUI (`options.skillfulOptions`) | Sous-choix `ancestryExtraSkill` (18 cartes) |
| Human | Versatile (1 Origin Feat parmi 4 — voir D4) | **NON** | NON | Recoupe variante featAtLevel1 — owner plan 14, cf. DEBT.md > D4 |
| Orc | aucun | N/A | N/A | OK |
| **Tiefling** | Size (Medium / Small) | **OUI** (13.8) | constante `ANCESTRY_SIZE_VALUES` | Sous-choix `ancestrySize` |
| **Tiefling** | Fiendish Legacy (3 options : Abyssal / Chthonic / Infernal) | **OUI** (13.8) | OUI (`options.tieflingLegacies`) | Cantrip + L3/L5 inscrits dans `knownSpells.ancestry`, **rendu sheet OK (13.8b)** : carte cliquable + chip « Héritage Infernal/Abyssal/Chtonien » dans la `SpellList` ; cast (incl. compteur 1×/jour L3+L5) → DEBT D12 |
| Tiefling | Spellcasting Ability pour Fiendish Legacy + Otherworldly Presence | **OUI** (13.8) | constantes hardcodées | Sous-choix `ancestryCastingAbility` partagé entre Héritage fiélon + Thaumaturgie |

### A.2 — Listes exactes (à intégrer dans `ancestries.json` après extension schema)

**Dragonborn — Draconic Ancestry (10 options)** :

| Type (EN) | Type (FR) | Type de dégâts |
|---|---|---|
| Black | Noir | Acid / Acide |
| Blue | Bleu | Lightning / Foudre |
| Brass | Airain | Fire / Feu |
| Bronze | Bronze | Lightning / Foudre |
| Copper | Cuivre | Acid / Acide |
| Gold | Or | Fire / Feu |
| Green | Vert | Poison / Poison |
| Red | Rouge | Fire / Feu |
| Silver | Argent | Cold / Froid |
| White | Blanc | Cold / Froid |

Mécanique liée : `Breath Weapon` (1d10 L1 → 2d10 L5 → 3d10 L11 → 4d10 L17, DC = 8 + Con + PB, Cône 15 ft / Ligne 30 ft) + `Damage Resistance` du même type.

**Tiefling — Fiendish Legacy (3 options)** :

| Héritage | Résistance L1 | Cantrip L1 | Sort L3 | Sort L5 |
|---|---|---|---|---|
| Abyssal | Poison | Poison Spray / Bouffée empoisonnée | Ray of Sickness | Hold Person |
| Chthonic / Chtonien | Necrotic | Chill Touch / Contact glacial | False Life | Ray of Enfeeblement |
| Infernal | Fire | Fire Bolt / Trait de feu | Hellish Rebuke | Darkness |

Le cantrip Thaumaturgy (Otherworldly Presence) est automatique, mais utilise la caractéristique d'incantation choisie ici.

**Elf — Elven Lineage (3 options)** :

| Lignage | Bénéfice L1 | Sort L3 | Sort L5 |
|---|---|---|---|
| Drow | Darkvision → 120 ft + cantrip Dancing Lights | Faerie Fire | Darkness |
| High Elf / Haut-elfe | Cantrip Prestidigitation (swap Wizard à chaque Long Rest) | Detect Magic | Misty Step |
| Wood Elf / Elfe sylvestre | Vitesse → 35 ft + cantrip Druidcraft | Longstrider | Pass without Trace |

**Gnome — Gnomish Lineage (2 options)** :

| Lignage | Bénéfice |
|---|---|
| Forest Gnome / Gnome des forêts | Cantrip Minor Illusion + Speak with Animals préparé (PB fois/LR sans slot) |
| Rock Gnome / Gnome des roches | Cantrips Mending + Prestidigitation + fabrication d'appareils Tiny (10 min) |

**Goliath — Giant Ancestry (6 options)** — utilisation = PB fois par Long Rest :

| Ancestry | Effet |
|---|---|
| Cloud's Jaunt / Saut des nuées | Bonus Action : téléport 30 ft |
| Fire's Burn / Brûlure ignée | Sur coup au but : +1d10 Fire |
| Frost's Chill / Froid mordant | Sur coup au but : +1d6 Cold + −10 ft Speed |
| Hill's Tumble / Renversement | Sur coup au but cible ≤Large : Prone |
| Stone's Endurance / Endurance de la pierre | Réaction : réduit dégâts de 1d12 + Con |
| Storm's Thunder / Tonnerre | Réaction si dégâts par cible ≤60 ft : 1d8 Thunder à la cible |

**Human — Versatile (Origin Feat — 4 SRD)** : voir section D.4.

---

## B — Sous-choix de création L1 par classe

> Source : `SRD_CC_v5.2.1.txt` sections classes pp. 28-79 EN. Confirmation FR via `FR_SRD_CC_v5.2.1.txt`.
>
> **Note transverse** : la caractéristique d'incantation est **toujours imposée**, jamais un choix (Cleric/Druid/Ranger = WIS ; Bard/Sorcerer/Warlock/Paladin = CHA ; Wizard = INT).
>
> **Sous-classes** : toutes au **niveau 3** en SRD 5.2.1 — hors périmètre création. Le `subclassId: null` hardcodé dans `submit-from-wizard.ts` est correct.

### B.1 — Tableau classe × sous-choix

| Classe | Sous-choix L1 SRD au-delà de skills/équipement/sorts | Géré wizard ? | Donnée présente ? | Sévérité |
|---|---|---|---|---|
| **Barbarian** | Weapon Mastery — **2 armes** courantes/de guerre CàC | **NON** | NON | HAUTE |
| **Bard** | (Note : 3 skills parmi **TOUTES**, pas une liste restreinte) | À vérifier | À vérifier | MOYENNE |
| Bard | 3 instruments de musique | **NON ?** | À vérifier | FAIBLE |
| **Cleric** | **Divine Order** (Protector / Thaumaturge) | **NON** | NON | CRITIQUE |
| **Druid** | **Primal Order** (Magician / Warden) | **NON** | NON | CRITIQUE |
| **Fighter** | **Fighting Style** (1 parmi 4 SRD) | **NON** | NON (feats absents) | CRITIQUE |
| Fighter | Weapon Mastery — **3 armes** | **NON** | NON | HAUTE |
| Monk | aucun (Martial Arts + Unarmored Defense auto ; 1 tool au choix : artisan/instrument) | partiel | à vérifier | FAIBLE |
| **Paladin** | Weapon Mastery — **2 armes** | **NON** | NON | HAUTE |
| **Ranger** | Weapon Mastery — **2 armes** | **NON** | NON | HAUTE |
| **Rogue** | **Expertise** (2 parmi les 4 skills choisis) | **NON** | NON | CRITIQUE |
| Rogue | Weapon Mastery — **2 armes** | **NON** | NON | HAUTE |
| Rogue | Thieves' Cant auto + **1 langue supplémentaire au choix** | **NON** | NON (tables langues absentes ?) | MOYENNE |
| Sorcerer | aucun (Origin = L3 en 2024 — pas de Metamagic à L1) | OK | OK | OK |
| **Warlock** | **1 Eldritch Invocation** parmi 5 éligibles L1 | **NON** | NON | CRITIQUE |
| **Wizard** | **Spellbook = 6 sorts L1 inscrits** dont **4 préparés** (le wizard doit distinguer ces 2 listes) | À vérifier | À vérifier | HAUTE |

### B.2 — Détails des sous-choix critiques

**Cleric — Divine Order (2 options)** :
- **Protector / Protecteur** : maîtrise armes de guerre + formation armures lourdes.
- **Thaumaturge** : 1 cantrip Clerc supplémentaire + bonus aux tests INT (Arcana ou Religion) = mod. Sagesse (min +1).

**Druid — Primal Order (2 options)** :
- **Magician / Mage** : 1 cantrip Druide supplémentaire + bonus aux tests INT (Arcana ou Nature) = mod. Sagesse (min +1).
- **Warden / Gardien** : maîtrise armes de guerre + formation armures intermédiaires.

**Fighter — Fighting Style (4 options SRD)** : voir D.2.

**Rogue — Expertise** : 2 compétences parmi les 4 skills choisis du Roublard (ou via Background). Double le PB sur ces compétences.

**Warlock — Eldritch Invocations L1** : **1 seule invocation** à L1. Les **5 invocations sans prérequis de niveau** (donc éligibles L1) :
1. **Armor of Shadows** — *armure du mage* sur soi sans slot.
2. **Eldritch Mind** — Avantage aux JS Con pour maintenir Concentration.
3. **Pact of the Blade** — invoque une arme de pacte (Cha, dégâts nécro/psy/radiants au choix).
4. **Pact of the Chain** — *appel de familier* + formes spéciales (Imp, Pseudodragon, Sprite, etc.).
5. **Pact of the Tome** — Codex des Ombres : 3 cantrips + 2 sorts L1 rituels de toute classe.

⚠️ **Changement majeur 2024** : les anciens Pact Boons L3 (Blade/Chain/Tome) sont devenus des invocations accessibles dès L1.

> **État implémentation (2026-05-20, plan 13.9 commit 4e)** : sous-choix posé au wizard (`warlock-invocation-chooser`, gate Suivant) ET **rendu sur la fiche** en mode Essence (`InvocationsCard` « Manifestations occultes », chaque invocation cliquable → modale identité). **Moteur mécanique des 3 Pacts (Tome → sorts accordés / Chain → familier / Blade → arme de pacte) + passifs (Armure d'ombres CA / Esprit occulte concentration) → différés en `plans/DEBT.md > D13`.** Terminologie FR officielle : « Manifestation occulte » (Black Book Editions PHB FR).

**Wizard — Spellbook** : 6 sorts L1 dans le grimoire + 4 préparés au démarrage parmi ces 6. Cantrips : 3.

### B.3 — Compétences à choisir L1 par classe (nombre + parmi quoi)

| Classe | Nombre | Liste source |
|---|---|---|
| Barbarian | 2 | Animal Handling, Athletics, Intimidation, Nature, Perception, Survival |
| **Bard** | **3** | **TOUTES** les compétences D&D 5e (changement 2024) |
| Cleric | 2 | History, Insight, Medicine, Persuasion, Religion |
| Druid | 2 | Animal Handling, Arcana, Insight, Medicine, Nature, Perception, Religion, Survival |
| Fighter | 2 | Acrobatics, Animal Handling, Athletics, History, Insight, Intimidation, Persuasion, Perception, Survival |
| Monk | 2 | Acrobatics, Athletics, History, Insight, Religion, Stealth |
| Paladin | 2 | Athletics, Insight, Intimidation, Medicine, Persuasion, Religion |
| Ranger | 3 | Animal Handling, Athletics, Insight, Investigation, Nature, Perception, Stealth, Survival |
| **Rogue** | **4** | Acrobatics, Athletics, Deception, Insight, Intimidation, Investigation, Perception, Persuasion, Sleight of Hand, Stealth |
| Sorcerer | 2 | Arcana, Deception, Insight, Intimidation, Persuasion, Religion |
| Warlock | 2 | Arcana, Deception, History, Intimidation, Investigation, Nature, Religion |
| Wizard | 2 | Arcana, History, Insight, Investigation, Medicine, Nature, Religion |

### B.4 — Cantrips + sorts L1 par classe

| Classe | Cantrips L1 | Sorts L1 préparés/connus | Notes |
|---|---|---|---|
| Bard | 2 | 4 | Liste de classe |
| Cleric | 3 | 4 préparés (= mod. Sagesse + niveau, min 1) | — |
| Druid | 2 (+1 si Magician) | 4 préparés | — |
| Paladin | 0 | 2 préparés | Pas de cantrips à L1 |
| Ranger | 0 | 2 préparés | Cantrips arrivent L2 si voie Druidic Warrior |
| Sorcerer | 4 | 2 connus | — |
| Warlock | 2 | 2 connus (Pact Magic) + 1 slot L1 | — |
| **Wizard** | **3** | **6 inscrits / 4 préparés** | Distinction importante |

---

## C — Tables structurelles transverses

### C.1 — Weapon Mastery — 8 propriétés × 37 armes

> Source : `SRD_CC_v5.2.1.txt:8526-8632` + `FR_SRD_CC_v5.2.1.txt:9857-9971`.
>
> **Note FR terminologie** : "Weapon Mastery" (aptitude de classe) = **Bottes d'arme**. "Mastery property" (propriété d'arme) = **Botte d'arme** / **propriété botte**. "Maîtrise" en FR est réservé à *weapon proficiency*. Le bundle utilise déjà "Bottes d'arme" — cohérent.

**Les 8 propriétés** :

| EN | FR | Effet (synthèse) |
|---|---|---|
| Cleave | Enchaînement | Coup CàC réussi → attaque suppl. sur 2ᵉ créature ≤1,50 m. Pas de mod. Cara. 1×/tour. |
| Graze | Écorchure | Jet d'attaque raté → dégâts = mod. Cara. d'attaque (même type). |
| Nick | Coup double | Attaque suppl. Light dans l'action Attaque (au lieu d'Action Bonus). 1×/tour. |
| Push | Poussée | Coup réussi → repousse 3 m si cible ≤Large. |
| Sap | Sape | Coup réussi → Désavantage au prochain jet d'attaque de la cible. |
| Slow | Ralentissement | Coup réussi avec dégâts → Vitesse −3 m (non cumulable). |
| Topple | Renversement | Coup réussi → JS Con (DD 8 + mod. cara + PB). Échec = Prone. |
| Vex | Ouverture | Coup réussi avec dégâts → Avantage au prochain jet d'attaque sur cette cible. |

**Les 37 armes — table complète** :

| Arme EN | Arme FR | Catégorie | Mastery |
|---|---|---|---|
| Club | Gourdin | Simple CàC | Slow |
| Dagger | Dague | Simple CàC | Nick |
| Greatclub | Massue | Simple CàC | Push |
| Handaxe | Hachette | Simple CàC | Vex |
| Javelin | Javeline | Simple CàC | Slow |
| Light Hammer | Marteau léger | Simple CàC | Nick |
| Mace | Masse d'armes | Simple CàC | Sap |
| Quarterstaff | Bâton de combat | Simple CàC | Topple |
| Sickle | Serpe | Simple CàC | Nick |
| Spear | Lance | Simple CàC | Sap |
| Dart | Fléchette | Simple distance | Vex |
| Light Crossbow | Arbalète légère | Simple distance | Slow |
| Shortbow | Arc court | Simple distance | Vex |
| Sling | Fronde | Simple distance | Slow |
| Battleaxe | Hache d'armes | Martiale CàC | Topple |
| Flail | Fléau d'armes | Martiale CàC | Sap |
| Glaive | Coutille | Martiale CàC | Graze |
| Greataxe | Hache à deux mains | Martiale CàC | Cleave |
| Greatsword | Épée à deux mains | Martiale CàC | Graze |
| Halberd | Hallebarde | Martiale CàC | Cleave |
| Lance | Lance d'arçon | Martiale CàC | Topple |
| Longsword | Épée longue | Martiale CàC | Sap |
| Maul | Maillet d'armes | Martiale CàC | Topple |
| Morningstar | Morgenstern | Martiale CàC | Sap |
| Pike | Pique | Martiale CàC | Push |
| Rapier | Rapière | Martiale CàC | Vex |
| Scimitar | Cimeterre | Martiale CàC | Nick |
| Shortsword | Épée courte | Martiale CàC | Vex |
| Trident | Trident | Martiale CàC | Topple |
| Warhammer | Marteau de guerre | Martiale CàC | Push |
| War Pick | Pic de guerre | Martiale CàC | Sap |
| Whip | Fouet | Martiale CàC | Slow |
| Blowgun | Sarbacane | Martiale distance | Vex |
| Hand Crossbow | Arbalète de poing | Martiale distance | Vex |
| Heavy Crossbow | Arbalète lourde | Martiale distance | Push |
| Longbow | Arc long | Martiale distance | Slow |
| Musket | Mousquet | Martiale distance | Slow |
| Pistol | Pistolet | Martiale distance | Vex |

**Allocation par classe à L1** : Barbarian 2, Fighter 3, Paladin 2, Ranger 2, Rogue 2. Total = **11 choix de Mastery à orchestrer dans le wizard**. Monk ne reçoit PAS Weapon Mastery en SRD 5.2.1.

### C.2 — Fighting Style — 4 dons SRD seulement

> Source : `SRD_CC_v5.2.1.txt:8293-8321` + `FR_SRD_CC_v5.2.1.txt:9583-9611`.

| Nom EN | Nom FR | Effet |
|---|---|---|
| Archery | Archerie | +2 aux jets d'attaque à distance |
| Defense | Défense | +1 CA en armure légère/intermédiaire/lourde |
| Great Weapon Fighting | Armes à deux mains | Relancer 1 et 2 sur les dés de dégâts d'arme à 2 mains / polyvalente |
| Two-Weapon Fighting | Combat à deux armes | Ajouter mod. cara aux dégâts de l'attaque bonus Light |

⚠️ **Dueling, Protection, Blind Fighting, Interception, Superior Technique, Thrown Weapon Fighting** sont dans le PHB 2024 commercial mais **PAS dans le SRD 5.2.1 CC**. GrimWar est légalement limité aux 4 ci-dessus tant qu'on respecte la règle "PDF = source #1".

Classes qui reçoivent un Fighting Style : Fighter L1, Paladin L2, Ranger L2.

### C.3 — Eldritch Invocations — 28 invocations dont 5 L1

> Source : `SRD_CC_v5.2.1.txt:6858-7093` + `FR_SRD_CC_v5.2.1.txt:7376-7634`.

| Nom EN | Nom FR | Prérequis | L1 ? |
|---|---|---|---|
| Armor of Shadows | Armure d'ombres | aucun | **✓** |
| Eldritch Mind | Esprit occulte | aucun | **✓** |
| Pact of the Blade | Pacte de la lame | aucun | **✓** |
| Pact of the Chain | Pacte de la chaîne | aucun | **✓** |
| Pact of the Tome | Pacte du grimoire | aucun | **✓** |
| Agonizing Blast | Décharge déchirante | Occ 2+, sort mineur Occ. attaque | — |
| Devil's Sight | Vision du diable | Occ 2+ | — |
| Eldritch Spear | Lance occulte | Occ 2+ | — |
| Fiendish Vigor | Vigueur fiélonne | Occ 2+ | — |
| Lessons of the First Ones | Enseignement des Premiers-Nés | Occ 2+ | — |
| Mask of Many Faces | Mille visages | Occ 2+ | — |
| Misty Visions | Visions embrumées | Occ 2+ | — |
| Otherworldly Leap | Saut d'outre-monde | Occ 2+ | — |
| Repelling Blast | Décharge répulsive | Occ 2+, sort mineur Occ. attaque | — |
| Ascendant Step | Pas aérien | Occ 5+ | — |
| Eldritch Smite | Frappe occulte | Occ 5+, Pact of the Blade | — |
| Gaze of Two Minds | Perception transférée | Occ 5+ | — |
| Gift of the Depths | Présent des profondeurs | Occ 5+ | — |
| Investment of the Chain Master | Engagement du maître des chaînes | Occ 5+, Pact of the Chain | — |
| Master of Myriad Forms | Maître des formes | Occ 5+ | — |
| One with Shadows | Maître des ombres | Occ 5+ | — |
| Thirsting Blade | Lame assoiffée | Occ 5+, Pact of the Blade | — |
| Whispers of the Grave | Murmures de la tombe | Occ 7+ | — |
| Gift of the Protectors | Présent des sauveurs | Occ 9+, Pact of the Tome | — |
| Lifedrinker | Buveuse de vie | Occ 9+, Pact of the Blade | — |
| Visions of Distant Realms | Royaumes lointains | Occ 9+ | — |
| Devouring Blade | Lame dévorante | Occ 12+, Thirsting Blade | — |
| Witch Sight | Vision sorcière | Occ 15+ | — |

Total : **28 invocations SRD**. L'Occultiste en reçoit 1 à L1, puis 3 à L2, etc. (table p. 72).

### C.4 — Origin Feats — 4 dons SRD (limite légale)

| Nom EN | Nom FR | Effet |
|---|---|---|
| Alert | Vigilant | Initiative Proficiency : +PB à l'init + swap d'init avec allié consentant |
| Magic Initiate | Initié à la magie | 2 cantrips + 1 sort L1 (Cleric/Druid/Wizard) + carac Int/Wis/Cha au choix |
| Savage Attacker | Sauvagerie martiale | 1×/tour : relance dés de dégâts d'arme, garde le meilleur |
| Skilled | Doué | 3 compétences/outils au choix. Répétable. |

⚠️ Le PHB 2024 commercial contient ~16 Origin Feats supplémentaires (Lucky, Tough, Healer, Tavern Brawler, Musician, Crafter, etc.) **non bundlables sans licence**. La variante featAtLevel1 (cf. D4 dans DEBT.md) doit se limiter à ces 4 si on respecte la règle "PDF = source #1".

### C.5 — Autres comptes feats SRD

| Catégorie | Compte SRD 5.2.1 | Détail |
|---|---|---|
| Origin Feats | **4** | ci-dessus |
| General Feats | **2** | Ability Score Improvement, Grappler |
| Fighting Style Feats | **4** | cf. C.2 |
| Epic Boon Feats | **7** | Combat Prowess, Dimensional Travel, Fate, Irresistible Offense, Spell Recall, Night Spirit, Truesight |
| **Total feats SRD** | **17** | — |

---

## D — Exhaustivité du contenu bundlé `public/data/`

### D.1 — Tableau de synthèse

| Catégorie | Présent | Attendu SRD | Manquants | Sévérité |
|---|---|---|---|---|
| classes | 12 | 12 | 0 | OK |
| subclasses | 12 | 12 | 0 | OK |
| ancestries | 9 | 9 | 0 | OK |
| subancestries | 0 (`[]`) | 0 par design | 0 | OK |
| backgrounds | 4 | 4 | 0 | OK |
| **feats** | **1** | **17** | **16** | CRITIQUE |
| conditions | 15 | 15 | 0 | OK |
| **spells** | **330** | **~333** | **21 manquants + 44 renames + 18 hors-SRD** | MOYEN |
| items — weapons | 38 | 38 | 0 | OK |
| items — armor + shield | 13 | 13 | 0 | OK |
| items — tools | 40 | ~39 | 0 (1 surnuméraire neutre) | OK |
| items — gear + packs | 99 | ~98 | 0 | OK |
| magic-items | 251 | ~258 | ~7 (variants probables) | FAIBLE |
| **monsters** | **0** | **332** | **332** | CRITIQUE (bloque S3) |
| **rules** | **0** | **~200** | **~200** | CRITIQUE |

### D.2 — Détail : feats manquants (16)

| Catégorie | Nom EN | Nom FR | Manquant |
|---|---|---|---|
| Origin | Alert | Alerte / Vigilant | ❌ |
| Origin | Magic Initiate | Initié à la magie | ❌ |
| Origin | Savage Attacker | Sauvagerie martiale | ❌ |
| Origin | Skilled | Doué | ❌ |
| General | Ability Score Improvement | Amélioration de caractéristique | ❌ |
| General | Grappler | Lutteur | ✓ (seul présent) |
| Fighting Style | Archery | Archerie | ❌ |
| Fighting Style | Defense | Défense | ❌ |
| Fighting Style | Great Weapon Fighting | Armes à deux mains | ❌ |
| Fighting Style | Two-Weapon Fighting | Combat à deux armes | ❌ |
| Epic Boon | Boon of Combat Prowess | — | ❌ |
| Epic Boon | Boon of Dimensional Travel | — | ❌ |
| Epic Boon | Boon of Fate | — | ❌ |
| Epic Boon | Boon of Irresistible Offense | — | ❌ |
| Epic Boon | Boon of Spell Recall | — | ❌ |
| Epic Boon | Boon of the Night Spirit | — | ❌ |
| Epic Boon | Boon of Truesight | — | ❌ |

### D.3 — Détail : spells

**21 sorts SRD 5.2.1 réellement absents** :

| FR | EN | Niveau |
|---|---|---|
| aliénation | Befuddlement | 5 |
| animation des objets | Animate Objects | 5 |
| aura de vie | Aura of Life | 4 |
| charme-monstre | Charm Monster | 4 |
| châtiment de fournaise | Searing Smite | 1 |
| châtiment divin | Divine Smite | feature→spell 2024 |
| convocation de dragon | Summon Dragon | 9 |
| couteau de glace | Ice Knife | 1 |
| entrave planaire | Planar Binding | 5 |
| épine mentale | Mind Spike | 2 |
| frappe piégeuse | Ensnaring Strike | 1 |
| glissement de terrain | Move Earth | 6 |
| imprécation | Hex | 1 |
| mot de pouvoir guérisseur | Power Word Heal | 9 |
| possession | Magic Jar | 6 |
| poussière d'étoile | Starry Wisp | 0 |
| rayon empoisonné | Ray of Sickness | 1 |
| souffle du dragon | Dragon's Breath | 2 |
| sphère de vitriol | Vitriolic Sphere | 4 |
| tsunami | Tsunami | 8 |
| vent divin | Divine Word | 7 |

**44 sorts présents sous un nom obsolète** (naming PHB 2014 avec noms propres — le SRD 5.2.1 les a renommés en supprimant les noms propres). Liste complète dans le rapport agent (exemples : `armure-de-mage` → `armure-du-mage`, `peur` → `terreur`, `gourdin-magique` → `crosse-des-druides`, `epee-de-mordenkainen` → `epee-arcanique`, `tentacules-noirs-d-evard` → `tentacules-noirs`, etc.). **Action recommandée** : refactor des IDs au standard SRD 5.2.1 + alias FR pour la recherche.

**18 sorts du bundle non-SRD** (probablement source AideDD FR-only). À vérifier dans le champ `source` (les samples lus indiquaient `source: "srd-5.2.1"` pour des sorts qui n'y sont pas — étiquetage à corriger).

### D.4 — Détail : monsters (332 manquants — TOUT le bestiaire)

Aucun monstre dans le bundle. Le SRD 5.2.1 contient 332 stat blocks classés en :
- **40 dragons** (Adult/Ancient/Young/Wyrmling × 10 couleurs).
- **6 géants** (Cloud, Fire, Frost, Hill, Stone, Storm).
- **7 démons** (Balor, Dretch, Glabrezu, Hezrou, Marilith, Nalfeshnee, Vrock).
- **10 diables** (Barbed/Bearded/Bone/Chain/Horned/Ice Devil, Erinyes, Imp, Lemure, Pit Fiend).
- **Morts-vivants** : Lich, Vampire, Vampire Spawn, Mummy Lord, Ghost, Wight, Wraith, Zombie, Skeleton, Shadow, Ghoul, Ghast, Will-o'-Wisp, etc.
- **Aberrations** : Aboleth, Chuul, Cloaker, Gibbering Mouther, Otyugh.
- **Méga-monstres** : Tarrasque, Kraken, Solar, Planetar, Deva, Sphinx.
- **~80 animaux** + **~30 PNJ génériques** + **lycanthropes** + **humanoïdes adversaires**.

**Bloquant pour le sprint S3** (encounters / combat tracker / map / journal).

### D.5 — Détail : rules (~200 manquants)

Rules Glossary (pp. 176-192 EN, lignes 17597-20718) + Gameplay Toolbox (pp. 192-204). Catégories absentes : Actions (Attack/Dash/Disengage/Help/Hide/etc.), Mécaniques (Advantage, Concentration, Cover, Initiative, Saving Throw, etc.), Vision/Lumière (Bright/Dim/Darkvision/Truesight), Vitesses, Conditions détaillées, Death Saves, Types de créatures (14), Écoles de magie (8), Hazards, Repos, Magic items mechanics, Encounter difficulty, Travel, Poisons (13), Traps, Environmental Effects.

---

## E — Findings exécutifs

1. **8 sous-choix L1 d'ascendance + 12 sous-choix L1 de classe absents du wizard = ~20 questions à poser au joueur que le wizard ne pose pas.** Un personnage généré aujourd'hui est mécaniquement incomplet sur Dragonborn (souffle injouable), Tiefling (héritage absent), Elf/Gnome (lignage + cantrip + ability), Goliath (ancestry inutilisable), Cleric/Druid (Order décisif pour armures et bonus), Fighter (Style + Mastery), Barbarian/Paladin/Ranger/Rogue (Mastery), Rogue (Expertise + langue), Warlock (1 invocation).

2. **Weapon Mastery est le sous-choix le plus systémique** : 11 choix d'armes à orchestrer sur 5 classes. Le SRD 2024 ne fait pas qu'ajouter un trait — il transforme chaque arme en objet typé par sa propriété. Le wizard ET la fiche (mode Combat) ET le moteur de dés doivent y répondre.

3. **3 catégories de contenu sont à zéro et critiques** : `feats.json` (1/17), `monsters.json` (0/332), `rules.json` (0/200). Le wizard L1 ne peut pas être 100% conforme tant que `feats.json` n'est pas complété (Fighting Style = un feat). Monsters bloque S3. Rules est nécessaire pour l'aide contextuelle.

4. **44 sorts du bundle ont un naming obsolète** (PHB 2014 avec noms propres). C'est un bug d'extraction qui devra être adressé avec un refactor d'IDs + alias FR pour la recherche.

5. **Le `subancestries.json: []` actuel est correct par design SRD** — les lignages ne sont PAS des sous-ascendances mais des choix internes au trait. Le pattern UI existant (`subancestryId` dans `ancestry-step.tsx`) doit être abandonné au profit d'une UI de sous-choix dans le trait. **Cela impacte le schema character** : `subancestryId` ne suffit pas, il faut `elvenLineage`, `gnomishLineage`, `giantAncestry`, `fiendishLegacy`, `draconicAncestry`, `spellcastingAbilityElvenLineage`, `spellcastingAbilityFiendishLegacy`, `spellcastingAbilityGnomishLineage`, `keenSensesSkill`, `humanSkillful`, `humanVersatileFeat`, `humanSize`, `tieflingSize`.

6. **Le schema character doit aussi porter les sous-choix de classe** : `divineOrder`, `primalOrder`, `fightingStyle`, `weaponMasteries[]` (array typé : id arme + nom propriété), `expertiseSkills[]`, `eldritchInvocations[]`, `bonusLanguageRogue`, `wizardSpellbookL1[]` (distinct de `preparedSpells[]`).

7. **Schema change → requires Adrien** (cf. CLAUDE.md autonomy rules). Cette extension du data model touche : `docs/DATA-MODEL.md`, types Firestore, security rules potentiellement (si on durcit la validation), composants wizard, modes de fiche (Combat lit `weaponMasteries[]`, Magie lit `castingAbility`, etc.). Migration de fiches existantes : aucune fiche en prod, donc OK — mais bumper `schemaVersion` quand même.

8. **Sorcerer L1 = aucun sous-choix structurel** — confirmé. Le wizard ne doit PAS demander de Sorcerous Origin (qui arrive à L3). Vérifier qu'il ne le fait pas actuellement.

9. **Bard L1 = 3 skills parmi TOUTES** (changement 2024 vs 2014). Si le wizard expose une liste de skills restreinte pour le Bard, il faut la passer à "toutes".

10. **Wizard L1 = distinction grimoire (6 sorts inscrits) vs préparés (4 parmi les 6)** — important pour le contenu de la fiche. Si le wizard actuel ne demande que 4 sorts ou demande 6 sans distinguer "inscrit" vs "préparé", c'est un bug.

11. **Origin Feats SRD limités à 4** — la variante `featAtLevel1` (cf. D4 dans DEBT.md) est légalement contrainte à ces 4 tant qu'on reste sur SRD CC.

12. **Fighting Styles SRD limités à 4** (Archery, Defense, Great Weapon Fighting, Two-Weapon Fighting). Pas de Dueling, Protection, Blind Fighting, Interception en SRD CC.

13. **Risque de fuite mécanique runtime déjà actif** : modes Combat (souffle Drakéide), Magie (sorts héritage Tiefling, cantrip Elf/Gnome), et tout calcul de DC sortilège qui repose sur `castingAbility` lisent depuis le perso. Sans sous-choix posé, ces modes affichent du vide ou plantent. **À vérifier si runtime guard ou crash** sur Dragonborn/Tiefling/Elf existant.

---

## F — Arbitrages demandés à Adrien (pour cadrage du plan de comblage)

> Décisions à prendre avant que je propose un découpe de plan(s). Sans ces arbitrages, tout découpe est arbitraire.

### F.1 — Périmètre du jalon 1 (création L1)

**Question** : le jalon 1 doit inclure quoi exactement ?

| Sous-périmètre | Inclus J1 ? |
|---|---|
| (a) Sous-choix L1 d'ascendances (8 sous-choix) | **oui** (acté) |
| (b) Sous-choix L1 de classes (12 sous-choix) | **oui** (acté) |
| (c) Tables transverses : 4 Fighting Style feats + 8 Mastery props sur 37 armes + 5 invocations L1 + 4 Origin Feats | **oui** (prérequis) |
| (d) Le reste des feats SRD non-L1 (General ASI, Epic Boons) | ? — utile seulement si on traite level-up en parallèle |
| (e) `monsters.json` (332) | ? — pas nécessaire pour création, bloque S3 |
| (f) `rules.json` (200) | ? — pas nécessaire pour création, utile pour aide contextuelle |
| (g) Renames + cleanups des 44 sorts obsolètes | ? — pas bloquant création mais cosmétique majeur |
| (h) Schema migration + bump `schemaVersion` | **oui** (prérequis à a-b) |

Ma recommandation : **(a)+(b)+(c)+(h) uniquement dans le jalon 1**. (d) attend le level-up. (e)(f) sont des chantiers contenu indépendants. (g) peut piggyback sur un autre passage spells.

### F.2 — Découpe en plans

**3 options sur la table** :

**Option α — Un seul plan "05.5 — Sous-choix création SRD 2024"** couvrant a+b+c+h. Avantage : refactor wizard + schema une seule fois. Risque : plan de ~3 semaines, difficile à demoer, validabilité incertaine.

**Option β — 4 plans séquentiels** :
- **05.5** : extension schema + UI primitives (Select sous-choix dans étape ascendance/classe) + extraction PDF en `public/data/` (10 dragons / 3 héritages / lignages / etc.).
- **05.6** : sous-choix ascendances (Dragonborn + Tiefling + Elf + Gnome + Goliath + Human).
- **05.7** : sous-choix classes — partie 1 (Cleric Divine Order + Druid Primal Order + Fighter Fighting Style + Wizard grimoire distinction).
- **05.8** : sous-choix classes — partie 2 (Weapon Mastery sur 5 classes + Rogue Expertise + Warlock Invocations + langues Rogue).

Avantage : chaque plan demoable, gates à chaque étape, risque réduit. Risque : 4 fois la cérémonie GSD.

**Option γ — Découpe par espèce / classe** (1 plan par entité). Trop fragmenté, je ne recommande pas.

Ma recommandation : **option β**.

### F.3 — Source des données : extraction automatisée ou enrichissement manuel ?

Les listes exactes sont dans cet audit (sections A.2, B.2, C.1-C.4) mais ne sont PAS dans `content-sources/extracted/srd/*.json`. Deux voies :

- **β1** : enrichir manuellement les JSON existants (`ancestries.json`, `classes.json`, `items.json`) en injectant les `options[]` depuis cet audit. Le travail est tracé, vérifiable contre PDF, ~200 entrées à éditer.
- **β2** : étendre `scripts/parse-srd-text.ts` pour extraire ces structures depuis les .txt. Investissement scripts plus lourd, gain : reproductibilité.

Ma recommandation : **β1 pour le jalon 1** (rapide, vérifiable), **β2 si on doit faire pareil sur monsters / rules** (volume justifie l'investissement).

### F.4 — Étiquetage `source` des sorts hors-SRD

Le bundle a 18 sorts qui ne sont pas dans le SRD 5.2.1 mais étiquetés `source: "srd-5.2.1"`. C'est :
- soit un bug d'extraction (re-étiqueter `source: "aidedd"`),
- soit une fuite de contenu non-CC (potentiellement problématique commercialement).

Décision à prendre avant qu'on touche `spells.json`.

### F.5 — Variante featAtLevel1 et limite SRD

Si on respecte strictement la règle "PDF source #1", la variante `featAtLevel1` ne peut proposer que **4 Origin Feats**. Le PHB 2024 commercial en a ~16. Est-ce qu'on :
- (i) reste sur les 4 SRD (légalement safe, frustrant joueur),
- (ii) on ouvre la porte à un import privé non bundlé (l'utilisateur peut ajouter ses propres feats via Maître),
- (iii) on retire la variante `featAtLevel1` tant qu'on n'a pas une solution pour les 16 manquants.

C'est lié à D4 dans DEBT.md.

---

## Fichiers consultés

- `content-sources/extracted/raw/SRD_CC_v5.2.1.txt` (lignes 28-79 classes, 7910-8269 ancestries, 8226-8269 feats, 8293-8321 fighting styles, 8526-8632 weapon mastery, 6858-7093 invocations, 17597-20718 rules glossary)
- `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt` (sections homologues)
- `content-sources/extracted/srd/{ancestries,classes,items,subclasses,backgrounds,conditions}.json` (extractions partielles)
- `public/data/{classes,ancestries,subancestries,backgrounds,feats,conditions,spells,items,magic-items,monsters,rules}.json` (bundle)
- `src/features/wizard/steps/{ancestry-step,class-step}.tsx`
- `src/features/wizard/submit-from-wizard.ts`
- `docs/DATA-MODEL.md`
- `plans/DEBT.md` (D4 featAtLevel1)
