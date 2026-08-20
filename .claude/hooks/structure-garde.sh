#!/bin/sh
# Charte de structure : refuse une écriture hors des adresses déclarées.
# Branché en PreToolUse sur Write|Edit. Sort en code 2 pour refuser.
# La charte est .claude/structure.json, traduite de socle/STRUCTURE-CIBLE.md.
exec python3 "$(dirname "$0")/structure-garde.py"
