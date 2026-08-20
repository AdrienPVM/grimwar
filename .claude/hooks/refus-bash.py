#!/usr/bin/env python3
"""Les trois refus.

Branché en PreToolUse sur Bash. Lit la commande, et sort en code 2 dans trois cas :

  1. `git commit` alors qu'un garde bloquant est rouge.
  2. une DDL vers la base de PRODUCTION.
  3. `git checkout --` ou `git restore` sur un fichier NON INDEXÉ.

Chaque refus explique, et nomme ce qu'il faut faire à la place.

Le troisième refus est né d'une perte réelle : Adrien a déjà perdu un lot entier par
un `git checkout --` sur du travail jamais indexé. Ce que git efface là ne va nulle
part : ni `reflog`, ni `stash`, ni corbeille.
"""
import json
import os
import re
import subprocess
import sys


def refus(titre, lignes):
    sys.stderr.write("REFUS : " + titre + "\n\n" + "\n".join(lignes) + "\n")
    sys.exit(2)


def racine_projet(depart):
    r = depart
    while not os.path.isdir(os.path.join(r, ".claude")):
        p = os.path.dirname(r)
        if p == r:
            return None
        r = p
    return r


def segments(commande):
    """Découpe une ligne de shell en commandes élémentaires.

    Un `&&`, un `;`, un `|` ou un saut de ligne sépare deux commandes. Sans ce
    découpage, `echo ok && git commit -m x` passerait sous le radar d'un simple
    `startswith`.
    """
    return [s.strip() for s in re.split(r"&&|\|\||[;\n|]", commande) if s.strip()]


# ---------------------------------------------------------------- refus 1
def gardes_rouges(racine):
    liste = os.path.join(racine, ".claude", "defauts", "GARDES-BLOQUANTS.txt")
    if not os.path.exists(liste):
        return []
    noms = []
    with open(liste, encoding="utf-8") as f:
        for l in f:
            l = l.strip()
            if l and not l.startswith("#"):
                noms.append(l)
    rouges = []
    for n in noms:
        r = subprocess.run(["pnpm", "--silent", "run", n],
                           cwd=racine, capture_output=True, text=True)
        if r.returncode != 0:
            rouges.append((n, (r.stderr or r.stdout or "").strip().splitlines()[:6]))
    return rouges


def controle_commit(cmd, racine):
    if not re.search(r"\bgit\s+(-\S+\s+|--\S+(=\S+)?\s+)*commit\b", cmd):
        return
    if "--no-verify" in cmd:
        refus("git commit --no-verify", [
            "Le drapeau qui saute les crochets saute aussi les gardes bloquants.",
            "Si un garde est rouge, la réponse est de le faire passer au vert,",
            "pas de le contourner.",
        ])
    rouges = gardes_rouges(racine)
    if rouges:
        lignes = ["Un garde bloquant est ROUGE. Le commit n'a pas lieu.", ""]
        for nom, extrait in rouges:
            lignes.append("  %s" % nom)
            for e in extrait:
                lignes.append("      " + e)
        lignes += [
            "",
            "La liste des gardes bloquants est .claude/defauts/GARDES-BLOQUANTS.txt.",
            "Elle grandit à chaque défaut signalé, et c'est le but : un défaut",
            "signalé une fois ne revient pas.",
            "",
            "Fais passer le garde au vert, puis recommence le commit.",
        ]
        refus("garde bloquant rouge", lignes)


# ---------------------------------------------------------------- refus 2
DDL = re.compile(
    r"\b(create|drop|alter|truncate|grant|revoke|reindex)\s+"
    r"(table|index|schema|view|type|function|trigger|policy|extension|database|"
    r"role|user|sequence|materialized|publication|subscription|constraint|column|on)\b",
    re.I)

# Un LANCEUR de migration porte une DDL même quand aucun mot SQL n'apparaît dans la
# ligne. C'est la faute que la contre-épreuve a trouvée :
# `tsx --env-file=.env.prod scripts/migrate.mts` passait, alors qu'il applique le
# schéma. On ne peut pas lire la DDL, on lit l'intention.
LANCEUR_DDL = re.compile(
    r"(supabase\s+db\s+(push|reset)|supabase\s+migration\s+up|"
    r"drizzle-kit\s+(push|migrate)|prisma\s+(migrate|db\s+push)|"
    r"\bmigrat\w*\.(m?[jt]s|sql|sh)\b|\bpnpm\s+\S*migrat|\bnpm\s+run\s+\S*migrat)",
    re.I)

# Ce qui désigne la PRODUCTION. `prod` dans un nom de variable compte : la
# contre-épreuve a montré que `psql $DATABASE_URL_PROD` passait sans cette ligne.
PROD = re.compile(
    r"(\.env\.prod|--env-file[= ]\S*prod|ENV=prod|NODE_ENV=production|"
    r"\$\{?\w*PROD\w*\}?|\b\w*_PROD\b|=\S*prod\S*|:prod\b|"
    r"--linked|--project-ref|--db-url\s+\S*prod)", re.I)

# Ce qui désigne explicitement autre chose que la production. Une marque locale
# EXPLICITE lève le doute : `supabase db push --local` doit passer, sinon le hook
# refuse le travail légitime et se fait désarmer en deux jours.
PAS_PROD = re.compile(
    r"(--local\b|\.env\.(staging|local|example)|localhost|127\.0\.0\.1|"
    r"--db-url\s+\S*local|:staging\b|ENV=staging)", re.I)


def controle_ddl(cmd):
    if PAS_PROD.search(cmd) and not re.search(r"\.env\.prod|--linked|:prod\b", cmd, re.I):
        return
    if not PROD.search(cmd):
        return
    if not (DDL.search(cmd) or LANCEUR_DDL.search(cmd)):
        return
    refus("DDL vers la base de PRODUCTION", [
        "Commande : %s" % cmd.strip()[:200],
        "",
        "ARRÊT NET. Cette commande porte une DDL et vise la production.",
        "",
        "Demande Adrien. Son accord doit être écrit dans la conversation, pas",
        "supposé d'un accord donné pour une autre commande.",
        "",
        "La raison n'est pas de principe : la recette Supabase est en pause,",
        "donc une DDL ne peut pas être RÉPÉTÉE avant la production, et une",
        "migration non répétée n'est pas une migration éprouvée.",
    ])


# ---------------------------------------------------------------- refus 3
def controle_restauration(cmd, racine):
    m = re.search(r"\bgit\s+(checkout|restore)\b(.*)$", cmd)
    if not m:
        return
    verbe, reste = m.group(1), m.group(2)
    if verbe == "checkout" and "--" not in reste:
        return                      # changement de branche, pas une restauration
    if verbe == "restore" and "--staged" in reste and "--worktree" not in reste:
        return                      # désindexer ne détruit rien du disque

    cibles = [t for t in reste.replace("--", " ").split()
              if not t.startswith("-")]
    if not cibles:
        cibles = ["."]

    perdus = []
    for cible in cibles:
        r = subprocess.run(["git", "status", "--porcelain", "--", cible],
                           cwd=racine, capture_output=True, text=True)
        for ligne in r.stdout.splitlines():
            index, arbre = ligne[0], ligne[1]
            chemin = ligne[3:]
            if arbre in ("M", "D") or index == "?":
                perdus.append(("non indexé" if index in (" ", "?") else "partiellement indexé", chemin))

    non_indexes = [p for p in perdus if p[0] == "non indexé"]
    if non_indexes:
        refus("restauration sur du travail NON INDEXÉ", [
            "Commande : %s" % cmd.strip()[:200],
            "",
            "Ce que git efface ici ne va NULLE PART. Ni reflog, ni stash, ni",
            "corbeille. Adrien a déjà perdu un lot entier par ce chemin.",
            "",
            "Travail qui disparaîtrait :",
        ] + ["    %-22s %s" % (e, c) for e, c in non_indexes] + [
            "",
            "À la place, dans l'ordre de sûreté :",
            "    git stash push -u -m 'avant restauration'   met à l'abri, réversible",
            "    git add -A && git stash                     idem, si tu préfères indexer",
            "",
            "Si tu veux vraiment jeter, indexe d'abord (git add), le refus tombera :",
            "un fichier indexé se retrouve par `git fsck --lost-found`.",
        ])


def main():
    try:
        entree = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    if entree.get("tool_name") != "Bash":
        sys.exit(0)
    commande = entree.get("tool_input", {}).get("command", "")
    if not commande:
        sys.exit(0)

    racine = racine_projet(entree.get("cwd") or os.getcwd())
    if not racine:
        sys.exit(0)

    for seg in segments(commande):
        controle_ddl(seg)
        controle_restauration(seg, racine)
        controle_commit(seg, racine)
    sys.exit(0)


if __name__ == "__main__":
    main()
