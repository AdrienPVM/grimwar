# Audit UX / UI transverse — 2026-08-03

> **Objet** : répertorier TOUS les scénarios d'usage de chaque feature, joueur et
> meneur, et juger objectivement la navigation, la hiérarchie de l'information et
> le rendu. Commande d'Adrien, 2026-08-03 : « réfléchis bien au User Experience,
> la facilité de naviguer, d'aller où on veut, de faire ce qu'on veut, qu'on soit
> un joueur ou un DM […] sois objectif ».
>
> **Statut** : audit de constat. Les correctifs sont listés en §E avec une
> priorisation impact × coût. Le lot livré le 2026-08-03 (bento + navigation)
> couvre §F ; le reste est un backlog à arbitrer.

---

## A. Méthode et périmètre

Audit **par lecture de code**, pas par ressenti : chaque constat ci-dessous
renvoie à un fichier et se vérifie en le lisant. Ce qui n'a pas pu être vérifié
est marqué « non vérifié » plutôt que supposé.

- Périmètre : les 23 routes déclarées dans `src/routes.tsx`, leurs écrans, et les
  chemins de navigation entre elles (relevé exhaustif des `navigate()` / `<Link>`
  de `src/features/**`).
- Hors périmètre : la justesse des règles D&D (couverte par `tests/wizard-matrix`
  et `plans/DEBT.md`), la performance, la sécurité (couvertes par
  `firestore.rules` + `tests/firestore-rules.test.ts`).
- Convention de gravité :
  - 🔴 **bloquant** — une chose que l'utilisateur veut faire est **impossible**
    par l'interface, ou le chemin est faux.
  - 🟠 **friction forte** — c'est possible mais coûteux (≥ 3 gestes pour une
    action fréquente) ou trompeur.
  - 🟡 **polish** — l'usage n'est pas empêché, le rendu ou la lisibilité souffre.

---

## B. Carte des routes et atteignabilité

Relevé exhaustif des cibles de navigation internes. « Atteignable » = il existe
au moins un contrôle cliquable qui y mène.

| Route | Rôle | Atteignable depuis | Verdict |
|---|---|---|---|
| `/` bibliothèque | tous | marque + « Retour » du NavShell | ✅ |
| `/create` wizard | tous | accueil (2 CTA) · `MyCharacterLink` · `LinkCharacterModal` | ✅ |
| `/character/:id` fiche | propriétaire | carte de perso, accueil | ✅ |
| `/codex` | tous | **hub d'accueil uniquement** | 🟠 §D-3 |
| `/account` | tous | losange avatar du NavShell | ✅ |
| `/account/content` packs | tous | écran Compte | ✅ |
| `/account/content/new` | tous | écran d'import | ✅ |
| `/campaigns` | tous | hub d'accueil | ✅ |
| `/campaigns/join` | tous | accueil (état vide) · liste des campagnes | ✅ |
| `/campaigns/:cid` | membre | carte de campagne | ✅ |
| `/campaigns/:cid/members/:uid/sheet` | MJ | roster « La compagnie » | ✅ |
| `/campaigns/:cid/sessions` | **tout membre** (rule 23.1) | **bouton MJ-only** | 🔴 §C-J7 |
| `/campaigns/:cid/sessions/:sid` | tout membre | liste des séances | ⤴ hérite du 🔴 |
| `/campaigns/:cid/encounters` | **tout membre** (rule 24.1) | **bouton MJ-only** | 🔴 §C-J6 |
| `/campaigns/:cid/encounters/:eid` | tout membre | liste des rencontres | ⤴ hérite du 🔴 |
| `/campaigns/:cid/journal` | tout membre | détail campagne | ✅ |
| `/campaigns/:cid/handouts` | tout membre | détail campagne | ✅ |
| `/campaigns/:cid/npcs` (+ `/:npcId`) | tout membre | détail campagne | ✅ |
| `/map-proto/cloud/:cid` (+ import/live/tv) | MJ | détail campagne | ✅ |
| `/map-proto` | — | **rien** | 🟡 route orpheline |
| `/dm` | — | **rien** (retirée du hub) | 🟡 route orpheline |
| `/debug-content` | — | **rien** | 🟡 route orpheline |

**Constat B-1 — 3 routes orphelines.** `/map-proto`, `/dm` et `/debug-content`
ne sont atteignables que par URL. `/dm` a été volontairement retirée du hub
(commentaire de `nav-hub.tsx` : « trompeuse pour un nouveau meneur »). Une route
qu'on a jugée trompeuse et qu'on laisse vivante est une dette : soit elle
redirige vers `/campaigns`, soit elle est supprimée. Idem `/debug-content`, dont
le composant est déjà marqué « À retirer ».

**Constat B-2 — deux écrans conçus pour les joueurs leur sont inaccessibles.**
`encounters-list-screen.tsx` et `sessions-list-screen.tsx` portent chacun un état
vide **spécifiquement rédigé pour un joueur** (`encounters.empty.member`,
`sessions.empty.member`) et leurs commentaires de tête disent explicitement « la
LISTE est lisible par tout membre ». Les rules Firestore l'autorisent. Mais dans
`campaign-detail-screen.tsx` les deux boutons sont à l'intérieur du bloc
`{isGm ? … : null}` (lignes 242-283). Le travail d'écriture et de règles a été
fait ; seul le point d'entrée manque. C'est le défaut le moins cher à corriger
de tout cet audit, et l'un des plus lourds de conséquence.

---

## C. Scénarios par feature

### C.1 — Parcours JOUEUR

**J1. Première ouverture, je n'ai rien.**
Chemin : `/` → état vide → « Créer un personnage » ou « Rejoindre une campagne »,
plus le hub Codex/Campagnes. ✅ **Bon.** Les deux intentions d'un nouveau venu
(j'arrive seul / on m'a invité) sont traitées à égalité, et le Codex est
consultable sans personnage.

**J2. Je crée mon personnage.**
Chemin : 9 étapes, brouillon persisté (`wizard-slice.ts`, middleware `persist`).
✅ **Bon.** Le brouillon survit à une fermeture d'onglet.
🟡 Non vérifié : rien n'indique à l'utilisateur qu'un brouillon existe quand il
revient sur l'accueil — il doit re-cliquer « Créer » pour le découvrir.

**J3. Je consulte ma fiche et je lance un dé.**
Chemin : accueil → carte → fiche ; jet par tap direct ou FAB radial. ✅ **Bon.**
Le FAB couvre « Aller à », « Sorts », « Repos », « Lancer », « Outils ».

**J4. Je monte de niveau.** Bouton dans la carte héros, toujours visible. ✅

**J5. Depuis ma fiche, je veux rejoindre ma campagne.**
🔴 **Impossible directement.** `sheet-screen.tsx` ne contient que deux liens, tous
deux `to="/"` (lignes 39 et 59), et seulement dans les états d'erreur. Pourtant la
fiche **connaît** sa campagne : `character.homeCampaignId` est lu ligne 25 pour en
faire la campagne active du pivot de dés. L'information est là, le lien n'existe
pas. Chemin réel : Retour → accueil → Campagnes → ma campagne = **4 gestes** pour
le déplacement le plus fréquent d'une soirée de jeu.

**J6. Le combat démarre, je veux voir l'ordre d'initiative et les PV du groupe.**
🔴 **Impossible par l'interface.** Cf. constat B-2. `EncounterPartyView` a été
écrit pour les joueurs (« lisible par TOUS (joueurs + MJ) », en-tête du fichier),
il montre « Votre groupe » / « Adversaires » — et aucun joueur ne peut y accéder
sans qu'on lui envoie l'URL.

**J7. Je veux relire les notes de la dernière séance.**
🔴 Même cause : le bouton « Séances » est MJ-only. Contournement partiel : le
Journal de campagne est accessible à tous et compile les séances terminées — mais
seulement les **terminées**, pas la séance en cours.

**J8. Le MJ vient de me partager un document.**
Chemin : fiche → accueil → Campagnes → campagne → Documents = **4 gestes**.
🟠 Un toast existe (`use-handout-notifications.ts`) mais il n'est monté que sur le
hub de campagne : depuis sa fiche — c'est-à-dire pendant la partie — le joueur ne
voit rien passer. Cf. D-5.

**J9. Je cherche la règle d'un état (« à terre », « empoigné »).**
🟠 Le Codex n'a **qu'un seul point d'entrée**, le hub de l'accueil. Depuis la
fiche en plein combat : Retour → accueil → Codex → États → chercher = 4-5 gestes.
Atténuation réelle : le mode Combat a sa propre modale de détail d'état
(`condition-detail-modal.tsx`) pour les états **actifs sur le personnage**. Le
trou concerne la consultation d'une règle qu'on ne subit pas.

**J10. Je gère mon inventaire / mes sorts.** ✅ Modes Avoir et Magie, listes
filtrables, base d'objets stricte. Densité desktop traitée par le présent lot.

**J11. Je repose (court / long).** ✅ Boutons en mode Combat + wedge FAB.

**J12. Je meurs.** ✅ Modale de jets de sauvegarde auto-montée, fiche en lecture
seule, bouton « Ressusciter » réservé au MJ.

**J13. Je joue hors ligne (la cave).**
✅ Bandeau hors-ligne (`offline-banner.tsx`), contenu SRD caché par Dexie,
persistance IndexedDB de Firestore. 🟡 Non vérifié dans cet audit : ce qu'affiche
l'app si une écriture échoue durablement hors ligne.

### C.2 — Parcours MENEUR

**M1. Je crée ma campagne et j'invite.** ✅ **Très bon.** Après création,
redirection vers le détail, et l'invitation est mise en avant comme « premier
pas » tant qu'aucun joueur n'a rejoint (`campaign-detail-screen.tsx` l. 334-348).
C'est le meilleur moment d'onboarding de l'app.

**M2. J'ouvre ma campagne et je choisis quoi faire.**
🟠 **Le point faible central.** Sept boutons `variant="secondary" size="sm"`
strictement identiques sur une seule ligne (Journal · Documents · PNJ · Réglages ·
Séances · Rencontres · Cartes). Aucune hiérarchie, aucun groupement, aucune action
primaire. Or ces sept items ne sont pas de même nature :
- **jouer maintenant** : Séances, Rencontres, Cartes
- **mémoire de la table** : Journal, Documents, PNJ
- **administration** : Réglages

Sur mobile, ces sept puces passent à la ligne et forment un pavé illisible en tête
d'écran, au-dessus même du titre de la campagne.

**M3. Je démarre la séance du soir.**
🟠 Campagne → Séances → créer/ouvrir. Correct, mais 🔴 **rien sur l'écran de
campagne n'indique qu'une séance est DÉJÀ en cours.** Le schéma le sait pourtant :
`SESSION_STATUSES` contient `'active'` (`shared/types/session.ts` l. 20) et
`ENCOUNTER_STATUSES` aussi (`shared/types/encounter.ts` l. 27). L'app ne répond
jamais à la question « qu'est-ce qui se passe **maintenant** ? » — c'est pourtant
la question d'un outil de table.

**M4. Je lance un combat.** ✅ Rencontres → créer → participants → initiative →
tours. Le tracker est temps réel.

**M5. En combat, je veux la fiche d'un joueur.**
🟠 Rencontre → retour rencontres → retour campagne → La compagnie → Voir la fiche
= **4 gestes**, en plein tour de jeu. Le roster n'est pas accessible depuis la
rencontre.

**M6. Je consulte la règle d'un monstre / d'un état pendant le combat.**
🟠 Même trou que J9 : pas d'accès Codex depuis la rencontre.

**M7. J'édite la fiche d'un joueur (omni-edit).** ✅ Roster → Voir la fiche →
édition, avec bandeau doré d'avertissement et champs d'identité verrouillés.

**M8. Je prends des notes / je lance un dé en secret.** ✅ Outils du meneur en bas
du détail de campagne (`SecretRollButton`, `QuickNotes`). 🟡 En bas d'un écran
long : en séance, il faut faire défiler pour les atteindre.

**M9. Je gère mes PNJ, mes documents, mon journal.** ✅ Trois écrans dédiés,
CRUD complet, visibilité `dm` / `all` respectée.

**M10. Je prépare une carte et je la projette.** ✅ Import `.dd2vtt`, jetons,
lumière, ligne de vue, vue TV. 🟡 L'entrée s'appelle « Cartes » et mène à
`/map-proto/…` : le mot « proto » n'est pas visible pour l'utilisateur, mais toute
l'arborescence d'URL le porte.

**M11. J'importe du contenu custom.** ✅ Via Compte → contenu. 🟠 Rangé dans
« Compte », donc à un endroit personnel, alors que le contenu sert la **table**.
Un meneur qui cherche à ajouter un monstre le cherchera dans sa campagne.

---

## D. Défauts transverses

**D-1 🔴 Le bouton « Retour » global ment.** `nav-shell.tsx` l. 53-67 : le lien est
`<Link to="/">` **en dur**, avec `aria-label` = « Retour à la bibliothèque ».
Depuis `/campaigns/:cid/encounters/:eid`, il renvoie donc à l'accueil, alors qu'un
second bouton « ← Retour aux rencontres » est présent dans la page. Deux
affordances « Retour » visuellement identiques, deux destinations différentes.
Pour un lecteur d'écran, l'annonce est fausse sur les 15 routes non-bibliothèque.

**D-2 🟠 Aucune notion de contexte courant.** Le NavShell affiche toujours la même
chose : marque, retour, avatar. Il n'indique jamais dans quelle campagne ni sur
quel personnage on se trouve. Une fois en profondeur (séance, rencontre, PNJ),
plus rien ne rattache l'écran à sa campagne.

**D-3 🟠 Le Codex est un cul-de-sac à entrée unique.** Cf. J9 / M6.

**D-4 🟠 Aucun signal « ça se passe maintenant ».** Cf. M3. Ni sur l'accueil, ni
sur la liste des campagnes, ni sur le détail. C'est la lacune la plus structurante
de l'audit : elle touche joueur et meneur, et les données existent déjà.

**D-5 🟠 La seule notification existante est confinée à un écran.**
`use-handout-notifications.ts` fait bien ce qu'il faut — écoute temps réel des
documents adressés au joueur, toast sur tout nouvel arrivage, premier snapshot
marqué « vu » sans bruit, garde `enabled: false` pour que le MJ ne se notifie pas
lui-même. Mais il n'est monté **que** sur `campaign-detail-screen.tsx` : le
joueur ne reçoit le toast que s'il est déjà sur le hub de sa campagne. Sa propre
documentation le dit (« Couverture "depuis n'importe quel écran" différée : pas
de layout campagne global en V1 »). Et rien d'autre ne notifie : combat démarré,
tour du joueur, PNJ révélé passent silencieusement. L'app est en temps réel
(`onSnapshot`) mais ne s'en sert que pour rafraîchir l'écran qu'on regarde déjà.

**D-6 🟡 La carte de personnage n'indique pas sa campagne.**
`library-screen.tsx` + `character-card.tsx` : aucune mention de `homeCampaignId`.
Avec plusieurs personnages, rien ne dit lequel appartient à quelle table.

**D-7 🟡 Le mode Magie d'un non-lanceur mégenrait le personnage.** Chaîne codée en
dur, accordée au féminin (« Cette aventurière ne connaît aucun art arcanique »),
hors du système `t()` — double infraction à `CLAUDE.md`. **Corrigé dans ce lot**
(clé `sheet.magie.noMagic`, formulation neutre).

**D-8 🟡 La sidebar de fiche passait sous le bandeau de navigation.** Épinglage à
`top-2` (8 px) alors que le NavShell est `sticky top-0` haut de 60 px, et hauteur
maximale `100vh - 1rem` qui ignorait ce décalage : au chargement, la colonne
débordait de 60 px sous la fenêtre et le 5ᵉ onglet (« Âme ») sortait de vue sur un
écran de 800 px de haut. **Corrigé dans ce lot**, avec test de non-régression.

**D-9 🟡 Les outils du meneur sont en bas d'un écran long.** Cf. M8.

**D-10 🟡 Aucune recherche transverse.** Pas de palette de commandes, pas de
recherche globale. Chaque liste a la sienne ; rien ne cherche « à travers ».

**D-11 🟡 Le placement dense du bento peut désaligner ordre visuel et ordre DOM.**
Compromis assumé et documenté dans `shared/components/bento.tsx` : les tuiles sont
des panneaux indépendants sans séquence de lecture, l'ordre de tabulation reste
celui du DOM. À réexaminer si une tuile devient dépendante de la précédente.

**D-12 🟡 Densité de texte des cartes de règles.** La carte Épuisement affiche le
texte SRD intégral en permanence, ce qui étire sa rangée de bento. Un repli
« lire la règle » la ramènerait à la taille de ses voisines.

---

## E. Backlog priorisé

Classement par **impact ÷ coût**. Tout ce qui suit est client-only sauf mention :
aucun changement de schéma, aucune Cloud Function, aucun chemin protégé.

| # | Correctif | Gravité | Coût | Notes |
|---|---|---|---|---|
| ~~E1~~ | ~~Ouvrir Séances + Rencontres aux joueurs~~ | 🔴 | XS | ✅ **livré 2026-08-03** |
| ~~E2~~ | ~~Lien « ma campagne » sur la fiche~~ | 🔴 | S | ✅ **livré 2026-08-03** |
| ~~E3~~ | ~~« Retour » contextuel~~ | 🔴 | S | ✅ **livré 2026-08-03** |
| ~~E5~~ | ~~Hiérarchiser l'écran de campagne~~ | 🟠 | M | ✅ **livré 2026-08-03** (2 groupes) |
| ~~E4~~ | ~~Bandeau « En cours » (séance / combat actifs) sur l'accueil~~ | 🟠 | M | ✅ **livré 2026-08-03**. **Aucun index à déployer** : `getActiveSession` / `getActiveEncounter` filtrent sur un seul champ (`where('status','==','active')` + `limit(1)`) ⇒ index automatique. La réserve « index à vérifier » est levée. Reste ouvert : le même bandeau **sur l'écran de campagne** (l'accueil couvre le besoin de reprise ; la campagne le dupliquerait à moindre valeur) |
| E6 | Accès Codex depuis la fiche et depuis la rencontre | 🟠 | S | Un wedge FAB + un bouton |
| E7 | Roster accessible depuis la rencontre (fiches des joueurs) | 🟠 | S | |
| E8 | Campagne d'attache affichée sur la carte de personnage | 🟡 | XS | |
| E9 | Rediriger ou supprimer `/dm`, `/map-proto`, `/debug-content` | 🟡 | XS | |
| E10 | Reprise de brouillon de wizard signalée sur l'accueil | 🟡 | S | |
| E11 | Repli « lire la règle » sur les cartes à texte SRD long | 🟡 | S | |
| E12 | Outils du meneur remontés / épinglés en séance | 🟡 | S | |
| E13 | Notifications in-app (document, tour de jeu, combat) | 🟠 | L | Le plus gros ; à cadrer en plan dédié. Étape 1 peu chère : remonter `useHandoutNotifications` au-dessus des routes plutôt que dans un seul écran |
| E14 | Recherche transverse / palette de commandes | 🟡 | L | |

**Recommandation d'ordre** : E1 → E2 → E3 → E5 formaient un lot « navigation »
cohérent et peu risqué — **livré le 2026-08-03**, cf. §F. **E4 a suivi le même
jour** : l'accueil répond désormais à « qu'est-ce qui se passe maintenant ? » et
mène au combat en cours en un tap, là où il fallait quatre écrans.
Le lot suivant est E6 + E7 (accès Codex et roster en cours de partie). E13
(notifications) mérite son propre plan — c'est le seul poste de coût L qui
change vraiment le produit.

---

## F. Ce que le lot du 2026-08-03 livre déjà

### F.1 — Navigation (E1, E2, E3, E5)

- **E3 — bouton Retour contextuel.** `shared/lib/parent-route.ts` : fonction
  pure `parentRouteFor(pathname)` qui remonte d'un cran dans la **hiérarchie**
  (et non dans l'historique — un lien partagé n'a pas d'entrée précédente, et un
  aller-retour entre écrans frères transformerait le bouton en bascule). Depuis
  une rencontre il ramène aux rencontres, depuis une carte à sa campagne.
  L'`aria-label` nomme désormais la destination réelle. 11 cas unitaires.
- **E1 — Séances et Rencontres ouvertes aux joueurs.** Test à rouge prouvé
  (« Unable to find an accessible element with the role "button" and name
  `/Séances/i` » sur le code re-gaté).
- **E5 — écran de campagne hiérarchisé.** Les actions passent **sous** le titre
  et se répartissent en « Jouer » / « Mémoire de la table » ; « Réglages » reste
  seul en barre haute (administration).
- **E2 — raccourci « Ma campagne » sur la fiche**, épinglé avec les onglets,
  masqué pour une fiche non liée et en lecture MJ.

### F.2 — Mise en page

- **Mise en page bento** des 5 modes de fiche, tablette **et** desktop
  (`shared/components/bento.tsx` + les 5 `*-mode.tsx`). Grille 6 colonnes,
  empreintes hétérogènes, remplissage dense, tuiles vides auto-supprimées par
  `:has()`. La tablette passe de colonne unique à 2 colonnes utiles.
- **D-8** — sidebar de fiche épinglée sous le NavShell, 5 onglets toujours
  visibles, verrouillé par un test e2e à 800 et 900 px de haut.
- **D-7** — chaîne mégenrante du mode Magie remplacée par une clé `t()` neutre.
- Invariants bento testés (`sheet-responsive-layout.spec.ts`) : grille 6 colonnes,
  zéro tuile fantôme, rangée d'en-tête pleine, remplissage dense effectif.
  **Rouge-avant-vert prouvé deux fois** — suppression du `dense` → « trou de 3
  col. » ; suppression de la règle `:has()` → « tuile fantôme ».
