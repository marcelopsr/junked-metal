# 08. Publicar

Objetivo: llevar la versión a Pages, la VPS y el Worker. Solo el orquestador y con pedido explícito. Servidor: [../guia/servidor.md](../guia/servidor.md).

1. `npm run publicar -- --seco`: imprime los pasos sin ejecutar.
2. Revisar el plan y el diff; `git status` limpio de lo ajeno.
3. `npm run publicar`: corre tests, build, e2e, deploy a la VPS y al Worker y chequeos de producción; corta al primer fallo.
4. Opciones: `--sin-e2e`, `--sin-novedades`, `--commit "mensaje"` (commitea y pushea al final; antes agrega a `portada/novedades.json` hasta 3 entradas de commits feat y fix desde el hash de `.publicado`).
5. El push a `master` dispara `.github/workflows/pages.yml`.

Se verifica: los chequeos de producción del propio script y https://marcelopsr.github.io/junked-metal/.

Trampas:
- `--commit` pushea: no usarlo sin aprobación.
- El build usa `base: "./"`: ninguna ruta absoluta en HTML, CSS ni manifiesto.
- Antes conviene `npm run verificar -- --nivel puerta`.
