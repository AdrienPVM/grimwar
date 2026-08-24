#!/bin/sh
# Charte de structure : refuse une écriture hors des adresses déclarées.
# Branché en PreToolUse sur Write|Edit. Sort en code 2 pour refuser.
# La charte est .claude/structure.json, traduite de socle/STRUCTURE-CIBLE.md.
#
# CE FICHIER-CI EST CELUI QUE `settings.json` ARME. Le `.py` porte la logique,
# mais c'est ce shim qui tire — et jusqu'au 2026-08-25 il échouait OUVERT :
# `exec python3 …` sans python3 sur le PATH sort **127**, et Claude Code ne
# bloque un appel d'outil que sur **2**. La charte disparaissait donc en
# laissant une ligne d'erreur qui se relit comme du bruit. Même défaut, mesuré
# le même jour, que `refus-bash.sh` et `spec-avant-code.sh` du plugin.
#
# Un garde-fou qu'on ne peut pas lancer compte comme ROUGE.
#
# Builtins seulement (`${0%/*}`, `echo`) : un PATH assez nu pour perdre python3
# peut aussi perdre `dirname` et `cat`, et un refus muet est un refus qu'on
# prend pour du bruit.
ICI="${0%/*}"
[ "$ICI" = "$0" ] && ICI=.

PY="$(command -v python3 2>/dev/null || command -v python 2>/dev/null)"
if [ -z "$PY" ]; then
  {
    echo "REFUS : la charte de structure n'a RIEN pu mesurer"
    echo
    echo "\`python3\` est introuvable sur le PATH. Le garde n'a pas pu se"
    echo "prononcer, et un garde-fou qu'on ne peut pas lancer compte comme"
    echo "ROUGE : sans cette sortie, un fichier naitrait hors de la charte."
    echo
    echo "Repare, puis relance :"
    echo "  macOS   xcode-select --install"
    echo "  sinon   installe python3, ou lance depuis un shell ou"
    echo "          \`command -v python3\` repond."
  } >&2
  exit 2
fi

exec "$PY" "$ICI/structure-garde.py"
