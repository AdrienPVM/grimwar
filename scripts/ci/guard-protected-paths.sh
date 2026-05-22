#!/usr/bin/env bash
# Job CI protected-paths-guard — COUCHE (b) DÉTECTION du flow mixte (plan 13.13).
#
# Filet pour les `--no-verify` et les pushes depuis une machine sans le hook.
# Échoue si un commit ajouté DIRECTEMENT à la mainline de `main` (`--first-parent`)
# et NON-MERGE (`--no-merges`) touche un path protégé. Les merges de PR sont
# exclus (la PR est la voie légitime des paths protégés).
#
# Ne tourne que sur `push: main` (cf. `if: github.event_name == 'push'` dans
# ci.yml) : sur une PR, toucher un path protégé n'est pas une violation.
#
# Entrées (env, fournies par GitHub Actions) :
#   BEFORE = github.event.before   AFTER = github.event.after
set -euo pipefail

# Le matcher est le voisin de ce script (robuste quel que soit le cwd / worktree).
HELPER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/protected-paths.sh"
[ -x "$HELPER" ] || { echo "::error::matcher introuvable : $HELPER"; exit 2; }
ZERO="0000000000000000000000000000000000000000"

: "${BEFORE:?BEFORE manquant (github.event.before)}"
: "${AFTER:?AFTER manquant (github.event.after)}"

if [ "$AFTER" = "$ZERO" ]; then
  echo "Push de suppression de branche — rien à inspecter."
  exit 0
fi

if [ "$BEFORE" = "$ZERO" ] || ! git cat-file -e "${BEFORE}^{commit}" 2>/dev/null; then
  # Nouvelle branche / base inconnue (shallow) : inspecte le seul commit de tête.
  commits="$AFTER"
else
  commits="$(git rev-list --first-parent --no-merges "${BEFORE}..${AFTER}")"
fi

if [ -z "${commits// /}" ]; then
  echo "Aucun commit direct non-merge à inspecter."
  exit 0
fi

files=""
for c in $commits; do
  files+="$(git diff-tree --no-commit-id --name-only -r "$c")"$'\n'
done

protected="$(printf '%s' "$files" | grep -v '^$' | sort -u | "$HELPER" || true)"

if [ -n "$protected" ]; then
  echo "::error::Paths protégés modifiés par un commit direct non-merge sur main :"
  printf '%s\n' "$protected" | sed 's/^/  • /'
  echo ""
  echo "Voie légitime : une PR (mergée avec un merge commit, exclu du garde-fou)."
  echo "Si ce push direct était conscient (--no-verify), ce rouge est le filet attendu (couche b)."
  exit 1
fi

echo "✓ Aucun path protégé touché par un commit direct non-merge sur main."
exit 0
