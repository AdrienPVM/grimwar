#!/usr/bin/env bash
# Source UNIQUE de vérité des paths protégés du flow mixte (CLAUDE.md, plan 13.13).
# Partagé par les deux couches : le hook .githooks/pre-push (prévention locale)
# ET le job CI protected-paths-guard (détection backstop). Une seule définition
# des patterns → zéro dérive entre les deux couches.
#
# Usage : reçoit des chemins de fichiers sur stdin (un par ligne), imprime sur
# stdout ceux qui matchent un path protégé. Exit 1 s'il y a au moins un match,
# 0 sinon.
#
# Paths protégés :
#   - public/data/**           bundles SRD durcis par les plans 13.7-13.10b
#   - scripts/data/srd-*.ts    données SRD curées (sources des bundles)
#   - .github/workflows/**     la pipeline CI elle-même
set -euo pipefail

# `^` s'applique à tout le groupe → chaque alternative est ancrée en début de ligne.
PROTECTED_REGEX='^(public/data/|scripts/data/srd-[^/]*\.ts$|\.github/workflows/)'

matches="$(grep -E "$PROTECTED_REGEX" || true)"

if [ -n "$matches" ]; then
  printf '%s\n' "$matches"
  exit 1
fi
exit 0
