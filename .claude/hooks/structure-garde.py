#!/usr/bin/env python3
"""Charte de structure, côté hook.

Lit l'entrée PreToolUse sur stdin, confronte le chemin visé à .claude/structure.json,
et sort en code 2 pour refuser. Le message nomme la charte et propose l'adresse correcte.

Un hook qui refuse tout est aussi faux qu'un hook qui ne refuse rien : il ne tient que
les trois choses que la charte énonce sans ambiguïté, et laisse passer le reste.
"""
import fnmatch
import json
import os
import sys


def charge_charte(racine):
    chemin = os.path.join(racine, ".claude", "structure.json")
    with open(chemin, encoding="utf-8") as f:
        return json.load(f)


def correspond(nom, motifs):
    return any(fnmatch.fnmatch(nom, m) for m in motifs)


def refus(lignes):
    sys.stderr.write("\n".join(lignes) + "\n")
    sys.exit(2)


def main():
    try:
        entree = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    outil = entree.get("tool_name", "")
    if outil not in ("Write", "Edit", "NotebookEdit", "MultiEdit"):
        sys.exit(0)

    cible = entree.get("tool_input", {}).get("file_path")
    if not cible:
        sys.exit(0)

    racine = entree.get("cwd") or os.getcwd()
    # Remonter jusqu'à la racine du dépôt qui porte la charte.
    depart = racine
    while not os.path.exists(os.path.join(racine, ".claude", "structure.json")):
        parent = os.path.dirname(racine)
        if parent == racine:
            sys.exit(0)  # pas de charte ici, le hook ne dit rien
        racine = parent

    cible = os.path.realpath(cible)
    racine_reelle = os.path.realpath(racine)
    if not cible.startswith(racine_reelle + os.sep):
        sys.exit(0)  # hors du projet, hors de la charte

    rel = os.path.relpath(cible, racine_reelle)
    segments = rel.split(os.sep)
    nom = segments[-1]
    seg0 = segments[0]

    try:
        charte = charge_charte(racine_reelle)
    except Exception as e:
        sys.stderr.write("charte de structure illisible : %s\n" % e)
        sys.exit(0)

    rac = charte["racine"]
    supplements = charte.get("supplementsDeclares", {})
    adresses = charte.get("adressesUniques", {})

    # 1. Le nom. Un instrument se nomme par ce qu'il mesure.
    exceptions = charte.get("exceptionsDeNom", [])
    if not any(fnmatch.fnmatch(rel, m) or fnmatch.fnmatch(nom, m) for m in exceptions):
        for motif in charte.get("nomsRefuses", []):
            if fnmatch.fnmatch(nom, motif):
                refus([
                    "REFUS de la charte de structure (.claude/structure.json).",
                    "",
                    "Le nom « %s » tombe sous le motif refusé « %s »." % (nom, motif),
                    charte.get("nomsRefusesMotif", ""),
                    "",
                    "Adresse correcte : nomme le fichier par ce qu'il EST ou ce qu'il",
                    "MESURE, pas par la tâche du jour. Si c'est une sortie d'instrument,",
                    "elle va sous .mesures/ et son nom dit la mesure.",
                ])

    # 2. La racine. Tout ce qui n'est pas déclaré y est refusé.
    if len(segments) == 1:
        autorises = rac["fichiersAutorises"]
        if not correspond(nom, autorises) and nom not in supplements:
            refus([
                "REFUS de la charte de structure (.claude/structure.json).",
                "",
                "« %s » n'est pas un fichier autorisé à la racine." % nom,
                "La racine ne reçoit que le README, le CLAUDE.md, la licence, le",
                "manifeste de paquet et les configurations d'outils qui l'exigent.",
                "",
                "Adresse correcte :",
                "  markdown durable (plan, audit, note, compte rendu)  ->  docs/%s" % nom,
                "  sortie d'instrument (capture, rapport, trace, PDF)  ->  .mesures/",
                "  script                                             ->  scripts/, et branché dans un package.json",
            ])
    else:
        toleres = rac.get("toujoursTolere", [])
        if (seg0 not in rac["repertoiresAutorises"]
                and seg0 not in supplements
                and seg0 not in toleres
                and seg0 not in adresses):
            refus([
                "REFUS de la charte de structure (.claude/structure.json).",
                "",
                "« %s/ » n'est pas un répertoire autorisé à la racine." % seg0,
                "Répertoires déclarés : %s" % ", ".join(sorted(rac["repertoiresAutorises"])),
                "",
                "Adresse correcte :",
                "  toute sortie d'instrument  ->  .mesures/%s" % rel,
                "  tout markdown durable      ->  docs/%s" % nom,
            ])

    # 3. Le markdown durable. Une seule adresse, docs/.
    if nom.lower().endswith(".md"):
        md = charte.get("markdown", {})
        if len(segments) == 1:
            if nom not in md.get("racineAutorisee", []):
                refus([
                    "REFUS de la charte de structure (.claude/structure.json).",
                    "",
                    "« %s » est un markdown à la racine." % nom,
                    "La racine n'en accepte que : %s." % ", ".join(md.get("racineAutorisee", [])),
                    "Aucun markdown de plan, de feuille de route, d'audit ou de note à la racine.",
                    "",
                    "Adresse correcte : docs/%s" % nom,
                ])
        elif (seg0 not in md.get("repertoiresAutorises", [])
                and nom not in md.get("nomsAutorisesPartout", [])):
            refus([
                "REFUS de la charte de structure (.claude/structure.json).",
                "",
                "« %s » est un markdown durable hors de son adresse unique." % rel,
                "docs/ reçoit tout markdown durable qui n'est ni README.md ni CLAUDE.md.",
                "",
                "Adresse correcte : docs/%s" % nom,
                "Si ce fichier est la note d'un paquet et doit rester sur place, il",
                "s'appelle README.md.",
            ])

    sys.exit(0)


if __name__ == "__main__":
    main()
