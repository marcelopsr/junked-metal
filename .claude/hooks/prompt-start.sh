#!/bin/sh
# UserPromptSubmit: marca el inicio del turno (para que Stop sepa cuánto tardó la tanda). No imprime nada.
sid=$(python3 -c 'import json,sys;print(json.load(sys.stdin).get("session_id","x"))' 2>/dev/null)
date +%s > "${TMPDIR:-/tmp}/rcfight-turno-${sid:-x}"
exit 0
