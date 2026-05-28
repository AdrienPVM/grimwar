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
