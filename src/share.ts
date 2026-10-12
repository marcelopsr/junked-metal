// Compartir PNG: Web Share con archivo si el navegador lo permite; si no, descarga.
export async function sharePng(b: Blob, name: string) {
  const f = new File([b], name, { type: "image/png" });
  if (navigator.canShare?.({ files: [f] })) {
    try { await navigator.share({ files: [f], title: "Junked Metal" }); } catch { /* cancelado */ }
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export interface Card { kills: number; time: string; level: number; car: string; win: boolean }
export function cardBlob(c: Card): Promise<Blob | null> {
  const cv = document.createElement("canvas"); cv.width = 1200; cv.height = 630;
  const g = cv.getContext("2d")!, F = "Rajdhani, sans-serif";
  g.fillStyle = "#14110f"; g.fillRect(0, 0, 1200, 630);
  g.strokeStyle = "#ff7a1a"; g.lineWidth = 8; g.strokeRect(16, 16, 1168, 598);
  g.fillStyle = "#ff7a1a"; g.font = `700 92px ${F}`; g.fillText("JUNKED METAL", 60, 140);
  g.fillStyle = c.win ? "#9be564" : "#e8e2da"; g.font = `600 40px ${F}`; g.fillText(c.win ? "VICTORIA" : "FIN DE LA PARTIDA", 64, 200);
  g.fillStyle = "#e8e2da"; g.font = `700 64px ${F}`;
  [["Bajas", String(c.kills)], ["Tiempo", c.time], ["Nivel", String(c.level)], ["Auto", c.car]].forEach(([k, v], i) => {
    g.fillStyle = "#9a8f84"; g.font = `600 36px ${F}`; g.fillText(k.toUpperCase(), 64, 310 + i * 76);
    g.fillStyle = "#e8e2da"; g.font = `700 60px ${F}`; g.fillText(v, 380, 314 + i * 76);
  });
  return new Promise((r) => cv.toBlob(r, "image/png"));
}
