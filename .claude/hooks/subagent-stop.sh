#!/bin/sh
# SubagentStop: guarda el informe final de cada subagente en .claude/trabajo/informes/<fecha>-<n>.md (del transcript),
# para que quede evidencia aunque el chat se compacte. No imprime nada.
cd "$(dirname "$0")/../.." || exit 0
mkdir -p .claude/trabajo/informes
python3 - "$(date +%Y-%m-%d-%H%M%S)" <<'EOF'
import json, sys, os
d = json.load(sys.stdin)
tp = d.get("agent_transcript_path") or d.get("transcript_path") or ""
if not tp or not os.path.exists(tp): sys.exit(0)
ultimo = ""; primero = ""
for line in open(tp, errors="replace"):
    try: o = json.loads(line)
    except Exception: continue
    m = o.get("message") or {}
    if o.get("type") == "user" and not primero:
        c = m.get("content"); primero = c if isinstance(c, str) else " ".join(x.get("text", "") for x in c if isinstance(x, dict) and x.get("type") == "text")
    if o.get("type") == "assistant":
        for c in m.get("content") or []:
            if isinstance(c, dict) and c.get("type") == "text" and c.get("text", "").strip(): ultimo = c["text"]
if not ultimo: sys.exit(0)
stamp = sys.argv[1]; aid = (d.get("agent_id") or d.get("session_id") or "x")[:8]
out = f".claude/trabajo/informes/{stamp}-{aid}.md"
with open(out, "w") as f:
    f.write(f"# Informe de subagente {aid} · {stamp}\n\n## Encargo (primeras líneas)\n\n{primero[:800]}\n\n## Informe final\n\n{ultimo}\n")
EOF
exit 0
