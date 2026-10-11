# Mapa Luna (Survivor) — decisiones del usuario

Fecha: 2026-10-10. Fuente de verdad para las fases del mapa Luna.

## Fase 1 — núcleo (en curso)
- Esfera real con gravedad radial: el auto maneja alrededor de un planeta chico y se siente que gira todo el tiempo.
- Lado del sol luminoso, lado lejano oscuro, niebla oscura densa: de los enemigos se ven sus luces acercándose.
- Cielo: Tierra a lo lejos, estrellas que giran, estrellas fugaces.
- Selector de mapa al elegir Survivor (Patio / Luna), luna desbloqueada.
- Enemigos: los del patio + versión robot con luces.

## Fase 2 — eventos y enemigos
- **Sol y Tierra lanzan bichos:** cuando el Sol o la Tierra están en pantalla (por el giro sobre la esfera), lanzan proyectiles que se ven viajar: bola de fuego desde el Sol, cohetito desde la Tierra. Al tocar la luna: aviso en el piso, impacto (si cae encima del auto, daña un poco) y del impacto sale un bicho. Del Sol, bichos de fuego; de la Tierra, bichos-cohete de chatarra.
- **Nave nodriza alienígena recurrente:** enemigo del mapa. Cada tanto aparece, persigue un rato desde el aire disparando y soltando aliens, y se va. No muere del todo: dañarla la echa antes y suelta premio.
- **3 naves alienígenas menores** como minijefes, con roles distintos (bombardera, abductora/levanta, caza rápida).
- **Pistolitas de onda:** varios aliens disparan una onda o rayo que se ve venir y se esquiva.
- **8 aliens de chatarra alienígena:** mismo idioma visual que las hormigas del patio (chatarra plegada, Folded) con forma y luz alienígena. Roles: enjambre, tirador de onda, saltador en baja gravedad, emboscador de cráter, flotante, tanque, explosivo, curandero/escudo. **Hechos los 8** (`src/aliens.ts`, 2026-10-11): flotante (vuela a altura fija sobre el radio sin deformar y pica contra el auto), tanque (placa frontal que deja pasar el 15 % del daño de frente; se lo rodea), explosivo (se arma con aro en el piso, revienta en área y deja un cráter con `deform`) y curandero (rayo verde y halo que curan al aliado más herido; se queda atrás). Números en `balance.json` (enemigos y ataques `alien_*`).
- **Eventos:** lluvia de meteoritos (mapa en rojo, marcas de impacto con aviso, cráteres humeantes) y erupción o falla lunar que se expande y obliga a escapar.
- **Sonido espacial:** ambiente sintetizado propio, sonidos amortiguados, efectos de meteoritos y naves.

## Terreno deformable (pedido 2026-10-10)
- Cada impacto de un proyectil o meteorito deja un cráter o un montículo que cambia la superficie de verdad, también la física.
- El terreno deformado agrega dificultad: hay cráteres hondos donde el auto se atora, bordes que piden tomar velocidad y montículos que sirven de rampa para saltar.
- La partida va cambiando el mapa: cuanto más avanza, más castigada queda la luna.
- Decidido por defecto (se puede cambiar): las deformaciones son permanentes durante la partida, con un tope de cráteres activos para el rendimiento. Al superar el tope, los más viejos se suavizan de a poco.
- El salto sale de la física (velocidad más rampa, con la baja gravedad lunar). Si hace falta, se agrega un impulso de salto con su tecla y botón táctil.
