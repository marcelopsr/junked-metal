#!/bin/sh
# PostToolUse(Edit|Write): tras tocar un .ts de src/ o test/ corre el tsc del repo (20 s de gracia por raíz)
# y avisa solo si hay errores en el archivo tocado; los errores ajenos no se reportan (otro agente los tiene).
. "$(dirname "$0")/lib.sh"
f=$(campo file_path)
case "$f" in */src/*.ts|*/test/*.ts|src/*.ts|test/*.ts) ;; *) exit 0;; esac
R=$(raiz "$f"); cd "$R" || exit 0
[ -x node_modules/.bin/tsc ] || exit 0
marca="${TMPDIR:-/tmp}/rcfight-tsc-$(printf '%s' "$R" | cksum | cut -d' ' -f1)"
ahora=$(date +%s); ult=$(cat "$marca" 2>/dev/null || echo 0)
[ $((ahora - ult)) -lt 20 ] && exit 0
echo "$ahora" > "$marca"
salida=$(node_modules/.bin/tsc --noEmit -p . 2>&1) && exit 0
rel=${f#"$R"/}
propios=$(printf '%s\n' "$salida" | grep -F "$rel" | head -15)
[ -z "$propios" ] && exit 0
printf 'tsc marca errores en %s:\n%s\n' "$rel" "$propios" >&2; exit 2
