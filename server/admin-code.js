// Código de un solo uso (15 min) para entrar al portal: `npm run admin-code` en la VPS.
import { openDb } from "./db.js";
console.log(openDb(process.env.DB_FILE || "/opt/junkedmetal/data/jm.db").newAdminCode());
