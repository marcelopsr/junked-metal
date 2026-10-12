// Banner de aviso de mantenimiento (GET /api/aviso → {texto, hasta} o 204). Cerrable; falla en silencio.
const el = document.getElementById("aviso");
if (el) fetch("/api/aviso").then((r) => (r.status === 200 ? r.json() : null)).then((a) => {
  if (!a?.texto) return;
  el.querySelector("span")!.textContent = a.texto;
  el.classList.remove("hidden");
  el.querySelector("button")!.onclick = () => el.classList.add("hidden");
}).catch(() => {});
