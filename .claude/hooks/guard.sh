#!/bin/sh
# PreToolUse(Bash): corta comandos prohibidos en este repo (ver docs/traspaso/trabajo/guardarrailes.md).
# exit 2 = bloqueado, el motivo va a Claude. Lee el comando entero (también heredocs y mensajes de commit).
leer() { python3 -c 'import json,sys;print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null; }
command -v python3 >/dev/null 2>&1 || leer() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).tool_input.command||"")}catch(e){console.log("")}})'; }
cmd=$(leer)
[ -z "$cmd" ] && exit 0
bloquear() { printf 'BLOQUEADO por .claude/hooks/guard.sh: %s\n' "$1" >&2; exit 2; }
t() { printf '%s\n' "$norm" | grep -Eq "$1"; }
# Normalizar: opciones globales de git (-C dir, -c k=v, --no-pager…) fuera; separadores y subshells como inicio de comando.
norm=$(printf '%s\n' "$cmd" | sed -E 's/git([[:space:]]+(-C|-c)[[:space:]]+[^[:space:]]+|[[:space:]]+--[a-z-]+(=[^[:space:]]+)?)*[[:space:]]+/git /g; s/(npx|node_modules\/\.bin\/)[[:space:]]+pm2/pm2/g')
A='(^|[;&|(`"'"'"'$][[:space:]]*|xargs[[:space:]]+(-[^[:space:]]+[[:space:]]+)*|sh[[:space:]]+-c[[:space:]]+["'"'"']?|sudo[[:space:]]+)'

# pm2: solo rc-dev y rc-demo se pueden reiniciar; nada de ids, ecosystem, all ni rc-test*
if t "${A}pm2[[:space:]]+(restart|stop|delete|del|reload|kill)"; then
  args=$(printf '%s\n' "$norm" | sed -nE 's/.*pm2[[:space:]]+(restart|stop|delete|del|reload|kill)[[:space:]]*(.*)$/\2/p' | head -1 | sed -E 's/[;&|].*$//')
  case "$args" in rc-dev|rc-demo|rc-dev\ *--*|rc-demo\ *--*) ;; *) bloquear "pm2 solo puede reiniciar rc-dev o rc-demo (uno por comando). rc-test* se autogestiona: correr de nuevo basta; npm run test:ls muestra estado." ;; esac
fi
t "${A}(pkill|killall)[[:space:]].*(vite|pm2|node|chrom)" && bloquear "no matar servidores ni navegadores a mano: los maneja pm2 y las herramientas cierran su Chromium."
t "${A}kill[[:space:]].*\\\$\\((lsof|pgrep)" && bloquear "kill de un proceso por puerto o nombre: los servidores los maneja pm2."

# git destructivo sobre el árbol de trabajo
t "${A}git[[:space:]]+(stash([[:space:]]+(push|save|pop|apply|drop|clear))?([^a-z-]|$)|stash[[:space:]]+-)" && ! t "${A}git[[:space:]]+stash[[:space:]]+(list|show)" && bloquear "git stash pisa el trabajo de otros agentes en este árbol."
t "${A}git[[:space:]]+restore([[:space:]]|$)" && ! t "${A}git[[:space:]]+restore[[:space:]]+--staged" && bloquear "git restore descarta cambios locales (--staged solo sí vale)."
t "${A}git[[:space:]]+clean[[:space:]]" && ! t "${A}git[[:space:]]+clean[[:space:]]+(-n|--dry-run)" && bloquear "git clean borra archivos sin versionar de otros."
t "${A}git[[:space:]]+reset[[:space:]]+(--hard|--merge|--keep)" && bloquear "git reset duro destruye cambios locales."
t "${A}git[[:space:]]+switch[[:space:]]+.*(-f|--force|--discard-changes)" && bloquear "git switch forzado descarta cambios."
if t "${A}git[[:space:]]+checkout([[:space:]]|$)"; then
  co=$(printf '%s\n' "$norm" | sed -nE 's/.*git[[:space:]]+checkout[[:space:]]*(.*)$/\1/p' | head -1 | sed -E 's/[;&|].*$//')
  set -- $co; pos=0; ruta=0
  for a in "$@"; do case "$a" in --) ruta=1 ;; -*) ;; *) pos=$((pos+1)); [ -e "$a" ] && ruta=1 ;; esac; done
  { [ "$ruta" = 1 ] || [ "$pos" -ge 2 ] || t "git[[:space:]]+checkout[[:space:]]+.*(-f|--force)"; } && bloquear "git checkout de archivos o forzado descarta cambios locales (cambiar de rama con un nombre solo sí vale)."
fi
t "${A}git[[:space:]]+branch[[:space:]]+.*(-D|--delete[[:space:]]+--force|-d[[:space:]]+-f)" && bloquear "borrar ramas a la fuerza: solo el dueño o después de integrar (git branch -d)."
t "${A}git[[:space:]]+worktree[[:space:]]+remove[[:space:]]+.*(-f|--force)" && bloquear "worktree remove forzado borra la tanda de un agente sin commit."
t "${A}git[[:space:]]+push.*(--force|-f([[:space:]]|$)|--mirror|--delete|[[:space:]]\\+[^[:space:]])" && bloquear "push forzado o destructivo."
t "${A}git[[:space:]]+push" && ! t "push-ok" && bloquear "git push solo cuando el dueño lo pidió en esta sesión: agregar el marcador «# push-ok» al comando (solo el orquestador, nunca un subagente)."

# borrar archivos
t "${A}find[[:space:]].*(-delete|-exec[[:space:]]+rm)" && bloquear "find -delete / -exec rm: borrar solo con rm sobre carpetas generadas."
if t "${A}rm[[:space:]]+.*(-[a-zA-Z]*[rR][a-zA-Z]*|--recursive)"; then
  args=$(printf '%s\n' "$norm" | sed -nE 's/.*rm[[:space:]]+(.*)$/\1/p' | head -1 | sed -E 's/[;&|].*$//')
  for a in $args; do
    a=$(printf '%s' "$a" | tr -d '"'"'"'')
    case "$a" in -*) continue ;; esac
    case "$a" in *..*) bloquear "rm -r con «..» en la ruta." ;; esac
    case "$a" in
      .shots*|./.shots*|.perf*|./.perf*|.e2e*|./.e2e*|.verificar*|./.verificar*|.evo*|./.evo*|dist|dist/*|./dist*|node_modules|node_modules/*|./node_modules*|scratch*|./scratch*|/tmp/*|/private/tmp/*|\$S*|\$SCRATCH*|\$TMPDIR*|"\$S"*|"\$SCRATCH"*|"\$TMPDIR"*|'$S'*|'$SCRATCH'*|'$TMPDIR'*|/private/tmp/claude-*|\$HOME/.cache*) ;;
      *) bloquear "rm -r solo sobre .shots/.perf/.e2e/.verificar/.evo/dist/node_modules/scratch/tmp (intentó: $a)." ;;
    esac
  done
fi
t "${A}:[[:space:]]*>[[:space:]]*src/" && bloquear "vaciar un archivo de src con redirección."
exit 0
