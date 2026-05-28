# MVP V1 — Décisions prises par défaut

Ce fichier trace TOUTES les décisions UX/produit prises par défaut par GSD pendant le développement V1, parce qu'elles n'étaient pas explicitement couvertes par plans/MVP-V1-SPEC.md.

Chaque entrée doit contenir :
- **Date** : YYYY-MM-DD
- **Jalon** : ex. 1A, 2D, etc.
- **Contexte** : pourquoi une décision était nécessaire
- **Options envisagées** : 2-3 alternatives considérées
- **Décision prise** : option retenue + courte justification
- **PR/Commit** : référence pour traçabilité
- **Status** : "à arbitrer par Adrien à l'UAT final" / "validée implicitement par usage"

Adrien lira ce fichier à l'UAT final et arbitrera les décisions qui ne lui conviennent pas. Une décision marquée "à arbitrer" qui n'est pas changée à l'UAT devient validée.

---

## Format d'entrée type

### [JALON-X] Titre court de la décision (YYYY-MM-DD)

**Contexte** : ...

**Options envisagées** :
1. Option A : ...
2. Option B : ...
3. Option C : ...

**Décision prise** : Option B parce que ...

**Référence** : PR #XX, commit abc1234

**Status** : à arbitrer par Adrien à l'UAT final

---

(les entrées seront ajoutées au fur et à mesure du développement)

---

### [JALON-1A.2] Mode Âme reste placeholder en V1 jalon 1 (2026-05-28)

**Contexte** : MVP-V1-SPEC.md JALON 1A demande « Sheet desktop complet pour LES 5 MODES (Identité/Âme, Combat, Magie, Essence, Avoir) ». Le mode Âme est actuellement un placeholder vide (ownerisé par plan 20 / Sprint 2). Lui donner du « traitement desktop » sans contenu réel = layout responsive d'une page vide.

**Options envisagées** :
1. Étendre le scope de 1A.2 pour livrer aussi le contenu du mode Âme (Personnalité / Aptitudes / Maîtrises / Histoire / Stats — plan 20 entier S2). Scope creep majeur estimé ~3-5 jours de travail.
2. Garder le placeholder mais lui appliquer un traitement desktop cohérent (rendu en `<section>` aligné avec les 4 modes contentés, centré au xl pas en grille 2-col vide). Le contenu réel est différé à un jalon ultérieur V1.
3. Différer entièrement le mode Âme au jalon 6 ou au-delà — ne rien faire en 1A.2.

**Décision prise** : Option 2 — le placeholder Âme est rendu en `<section role="tabpanel">` cohérent avec les 4 modes contentés et hérite des resets CSS scoped lg+. À xl+ il n'est PAS basculé en grille 2-col (volontairement absent du sélecteur xl). Le contenu réel du mode Âme (plan 20) reste un jalon ultérieur de V1 — la spec V1 ne le détaille pas et ne l'inclut pas dans le jalon 1.

Justification : option 1 explose le scope du jalon 1 (1A = sheet desktop, pas contented all modes). Option 3 laisse une zone visiblement cassée au desktop. Option 2 livre la cohérence visuelle V1 sans déborder.

**Référence** : PR à venir (feat/1A-2-sheet-ame-placeholder-desktop), commit à venir

**Status** : à arbitrer par Adrien à l'UAT final
