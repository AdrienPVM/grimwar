# Roadmap

Five sprints, **41 plans**, milestone-driven. (Plan 12 split en 12 « digital » + 12.5 « physique » — voir `plans/00-overview.md` > Swaps actés.)

## Milestones at-a-glance

| Sprint | Milestone | Calendar (mi-temps ~20h/sem) |
|---|---|---|
| **S1** | **v0.0.1 — Table-ready solo MVP** : Adrien joue Lyralei sur son téléphone, dés, FAB radial, offline | 5-6 semaines |
| **S2** | **v0.0.2 — Multi-user campaigns** : campagnes, invitations, wizard de création + level-up (multi-class), bibliothèque | 4-5 semaines |
| **S3** | **v0.0.3 — DM tools + auto-journal + handouts + NPCs** : vue MJ, event log, sessions, encounters, journal, omniedit, documents partagés, PNJs récurrents | 5-6 semaines |
| **S4** | **v0.0.4 — Carte + mode TV** : import .dd2vtt, tokens, lighting, fog of war, mode présentation TV | 4-5 semaines |
| **S5** | **v1.0 — Public release** : i18n EN, account+GDPR, legal, PDF export, spell sigils, stats publiques, prod | 3-4 semaines |
| | **Total mi-temps** | **22-26 semaines (~5-6 mois)** |

Rythme **soirs/weekends (~10h/sem)** : doubler → ~10-12 mois. Rythme **full-time** : ~3 mois.

## Sprint 1 — Table-ready MVP (plans 01-13, dont 12.5)

Goal: Adrien charge l'app sur son téléphone à la prochaine session, ouvre la fiche de Lyralei, joue tap-to-roll (digital ou physique), fonctionne offline.

Ordre effectif S1 (swap acté) : 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → **12 (digital)** → **12.5 (physique)** → **11 (radial FAB)** → 13.

End of S1: l'app est jouable solo à table, en digital ou en physique. Adrien la déploie sur son téléphone. Le mode Âme manque encore (S2), le wizard est manuel, mais c'est jouable.

## Sprint 2 — Campaigns + wizard (plans 14-20)

Goal: tes copains rejoignent une campagne via code/lien, créent leur PJ via le wizard (avec multi-class), level up via le wizard. Variants 5e configurables dès la création de campagne.

End of S2: tu invites tes joueurs, ils se créent eux-mêmes, vous jouez ensemble. Sync temps réel via Firestore.

## Sprint 3 — DM tools + auto-journal + handouts + NPCs (plans 21-28)

Goal: la vue MJ existe, tout est loggé, le journal s'écrit tout seul, tu envoies des documents à tes joueurs en session, tes PNJs récurrents sont gérés.

End of S3: tu es vraiment outillé en tant que MJ. Le journal compile auto. Tu prends tes notes par-dessus. Tes documents et PNJs vivent dans la campagne.

## Sprint 4 — Carte + mode TV (plans 29-33)

Goal: tu importes une map Dungeon Alchemist, tokens, dynamic lighting, fog of war, et tu peux brancher une TV avec un mode plein-écran qui affiche map + init de combat pour tes joueurs IRL.

End of S4: tu joues complet avec carte interactive en plus de Foundry sur la TV — sauf que c'est ta propre TV mode maintenant.

## Sprint 5 — Polish + public launch (plans 34-40)

Goal: prêt pour partage public ou commercialisation.

End of S5: v1.0 public, avec export PDF des fiches, animations de sorts, et pages stats partageables.

## Au-delà de v1.0 (post-launch backlog)

Features qu'on a explicitement choisi de pas faire en v1 :

- **Auto-conditions** — durée des sorts qui s'auto-décrémente au fil des tours
- **Combat replay** — rejouer un combat roll-par-roll après-coup
- **Push notifications** — "C'est ton tour", "Session démarrée", "Invitation"
- **Co-DM** — second MJ avec accès partiel à une campagne
- **Discord bot bridge** — relayer events vers un channel Discord
- **Imports** — Pathbuilder / DnDBeyond / Roll20 → GrimWar
- **Tutoriel intégré + perso d'exemple** au premier launch
- **Dés 3D** (`@3d-dice/dice-box`)
- **Thèmes par classe** (paladin gold/white, druid green, etc.)
- **Foundry VTT live sync** (socket bridge)
- **Sigils signature** dessinés à la main pour sorts iconiques (override procedural)
- **Spectator mode** + streaming overlay
- **Apple Sign-In**
- **Sound effects + ambiance music**
- **Lingering injuries** (variant 5e additionnelle)
- **Hero points** (variant 5e additionnelle)
- **Embedded widgets** ("Embed this campaign stats on your blog")
- **Subscription tier paywall** (si commercialisation) + Stripe + VAT MOSS

## Risques majeurs

| Risque | Impact | Mitigation |
|---|---|---|
| Content pipeline plus chiant que prévu (PDFs mal structurés) | +1-2 semaines S1 | Tester parse sur 5-10 sorts dès fin S1 plan 04 ; calibrer parsers avant tout lancer |
| Wizard complexity (variants + multi-class) | +1 semaine S2 | Stick SRD/Free Rules strict ; multi-class et 4 variants seulement (pas plus) |
| Real-time sync conflicts (DM + joueur édite même champ) | Bugs subtils en S3 | Last-write-wins simple par défaut, audit log permet de retrouver |
| PixiJS apprentissage en S4 | +1 semaine | Owlbear Rodeo open source en référence ; off-the-shelf si trop chronophage |
| Latency carte multi-joueur via Firestore | Drag de tokens lent | À mesurer plan 30 ; couche WebRTC en supplément si besoin |
| Puppeteer Cloud Function (PDF export) cold start | UX export lente | Pré-warm function ; afficher loader explicite |
| GDPR pas trivial à implémenter proprement | +0,5 semaine S5 | Compliance baseline depuis le départ ; juste fignoler en S5 |
| Burnout solo | Calendaire dérape | Time-box plans à 3-5 jours max, lean sur Claude Code, ship visible weekly |
