// Trae los respaldos de la VPS a ~/Backups/junkedmetal/ (solo copia; no borra nada local).
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const dest = join(homedir(), "Backups", "junkedmetal");
mkdirSync(dest, { recursive: true });
execFileSync("rsync", ["-av", "--include=jm-*.db.gz", "--exclude=*", "vps:/opt/junkedmetal/data/backups/", dest + "/"], { stdio: "inherit" });
