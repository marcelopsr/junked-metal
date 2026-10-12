# Chatarra, cofres, mejoras, máquinas y sinergias

## Tres economías, no una

1. **Chatarra de run — [CONFIRMADO]** fondo grupal compartido; se conserva entre mapas, se pierde al terminar run.
2. **XP global — [CONFIRMADO]** sube el nivel de todos; elecciones individuales.
3. **Metaprogresión — [CONFIRMADO]** desbloqueos/descubrimientos permanentes; no se paga con chatarra de run salvo conversión explícita futura [NO APROBADA].

## Fuentes y sumideros

Ingresos: enemigos, eventos, cofres especiales, pactos y objetivos. Gastos: cofres, tiendas, máquinas del Director, recicladoras/ensamblaje cuando corresponda. Toda transacción valida el saldo **en autoridad**, jamás confiar en el saldo de un cliente.

## Compras en equipo

Saldo visible a todos y registro compacto `Jugador → gasto → cosa adquirida`. Evitar que un jugador lo gaste todo: **[PROPUESTA]** pequeña confirmación/votación para compras superiores a un porcentaje configurable del fondo, con cooldown de gasto extremo; no votar cada cofre. Importante: no introducir fricción excesiva que contradiga el ritmo roguelite.

## Precio dinámico

Algunas fuentes escalan con amenaza/tiempo y loops (el dinero nunca desaparece solo). Mostrar precio antes de activar y explicar la tendencia. Propuesta de prototipo:

`price = clamp(round(basePrice * (1 + 0.012 * activeMinutes) * pow(1.08, completedLoops)), min, max)`.

No aplicar misma fórmula a todas las tiendas ni permitir inflación infinita. Un equipo que ahorra debe tener algunas oportunidades significativas de gasto posterior.

## Proveedores de recompensa

| Tipo | Visible antes de pagar | Aleatoriedad | Agencia |
|---|---|---|---|
| Cofre misterioso | Rareza/tabla aproximada | Alto | Decidir abrir |
| Tienda | Objeto y coste | Oferta cambiante | Compra dirigida |
| Máquina del Director | Conjunto de opciones | Moderada | Elegir solo una |
| Recicladora | Entrada, regla y resultado conocido/tabla | Variable | Intercambiar voluntariamente |
| Cofre especial | Banda de rareza | Mediano | Requiere evento/secretos |
| Ensambladora | Receta identificada | Bajo | Fusionar/evolucionar |

## Objetos y rarezas [PROPUESTA]

Definir `common / uncommon / rare / legendary / director / secret` como **categorías de diseño**, no paleta final ni cantidades garantizadas. Cada objeto tiene `itemId, rarity, tags, stackPolicy, effectId, procRules, cap, description, VFXCost, synergyHints`.

- `STACK`: copias suman beneficio mediante curva limitada, potencialmente rendimientos decrecientes.
- `SYNERGY`: coexistencia de tags crea reacción nueva sin consumir objetos.
- `EVOLUTION`: receta desbloqueada y condición (ensambladora/secretos/loop) transforma objeto o conjunto.
- `PASSIVE/ACTIVE`: disponibilidad según arquitectura actual y pruebas de usabilidad.

## Fórmula de stacking [PROPUESTA]

Para evitar probabilidades >100% y explosiones exponenciales: `effectiveChance = cap * (1 - exp(-n*k))`. Otras estadísticas pueden sumar con diminishing returns. El motor debe limitar reacciones por frame, entidad y run.

## Rerolls

Cada jugador tiene créditos limitados para cambiar sus tres opciones por nivel. No implican pausa global. Opcionalmente el Director ofrece una cuarta carta bajo pacto. La selección se genera en autoridad desde `lootRng`, pero puede ponderarse suavemente por sinergias; registrar cuánto se ponderó para depurar sesgos.

## Intercambios

Ciertos objetos se pueden regalar de forma voluntaria; cada transferencia tiene transaction ID, idempotencia, inventario propietario, consentimiento y validación de disponibilidad. No permitir comercio en estados inestables de migración/suspensión. No incluir mercado real ni monetización como suposición.

## Descubrimiento permanente

El códice muestra recetas conocidas, pistas de sinergia y efectos probados; las recetas secretas no deben revelarse por datos públicos de UI antes de descubrirse si queremos preservar misterio. Evitar que la progresión permanente obligue a grind para competir.

## Ejemplos creativos NO implementados

- **Bobina de mala suerte**: ataques cargados pueden rebotar a objetivo cercano.
- **Bomba de aplausos**: ciertas eliminaciones producen ondas de impacto.
- **Motor del bis**: tras completar un evento especial, bonificación temporal limitada.
- **Pagaré del Director**: deuda temporal de chatarra a cambio de elección de objeto; deberá ser un pacto con condiciones muy claras.

Cada ejemplo exige audit de efectos existentes antes de proponer código o gráficos nuevos.
