# Pactos del Director — riesgos, tentaciones y secretos

## Filosofía

Pacto = oportunidad de **riesgo voluntario + consecuencia comprensible + recompensa emocionante**. El Director puede ser embaucador en diálogos; los términos de la UI son contractuales y verdaderos. Los pactos se relacionan con su mood y memoria, pero nunca son coercitivos.

## Taxonomía aprobada

**Por duración**: `QUICK` (segundos/minutos), `STAGE` (hasta salir del mapa), `RUN` (hasta terminar expedición). **Por impacto**: `PERSONAL`, `TEAM` o `TEMPTATION` (favor personal que introduce perjuicio menor y temporal al grupo).

**Por exposición**: `PUBLIC` o `PRIVATE_UNTIL_REVEAL`. Cualquier coste **importante** para el equipo requiere votación. Un pacto privado solo puede provocar efectos de bajo impacto, limitados en tiempo y listados en pantalla al participante; en determinadas condiciones se revela teatralmente a los demás.

## Canales

1. Televisor o terminal físico interactivo (canal regular).
2. Invitación espontánea contextual (canal especial, no interrumpe combate); aparece como invitación compacta, ignorable, con expiración.
3. Pactos extraordinarios de loops avanzados, solo si compatibles con balance y estado actual.

## Contrato de un pacto

Campos: `id, offerId, tier, category, secrecy, eligibleTargets, consentPolicy, costSummary, rewardSummary, startTrigger, successCondition, failCondition, duration, maxTeamImpact, cooldown, rarity, cancelPolicy, fairnessTags`. Reglas de emisión y de activación quedan separadas.

Estados: `GENERATED → OFFERED → ACCEPTED/DECLINED/EXPIRED → ACTIVE → SUCCEEDED/FAILED/CANCELED → SETTLED → REVEALED_IF_APPLICABLE`.

## Pactos ilustrativos [PROPUESTA]

| Pacto | Tipo | Coste | Recompensa | Protección |
|---|---|---|---|---|
| Doble o chatarra | QUICK/TEAM | Emboscada visible, 90 s | Cofre de calidad superior | Consentimiento de grupo |
| La salud no es garantía | RUN/PERSONAL | Reducir HP máximo de run | Objeto singular | Mínimo de HP utilizable |
| Cobro al final | STAGE/PERSONAL | Precios aumentados en este mapa | Mejora puntual | Cap de precio |
| Producción sorpresa | QUICK/TEMPTATION | Pequeño grupo extra durante 45 s | Carta extra individual | Impacto menor, timer y reveal |
| ¿Un bis? | STAGE/TEAM | Modificador anunciado del portal | Premio grupal al completar | Voto + preparación |
| Apagón promocional | QUICK/PERSONAL | HUD secundario reducido por segundos | Chatarra extra | Nunca ocultar datos vitales ni accesibilidad |

Las cifras son muestras de diseño, no contenidos aprobados. **No combinar** penalizaciones incapacitantes con situaciones de rescate inevitable ni pactos «secretos» que comprometan la run de otros.

## Voto de pacto colectivo

Pacto de grupo inicia poll sincronizada por participante. El consentimiento debe permitir una regla de aprobación clara **[PROPUESTA: mayoría para pactos menores, unanimidad para coste permanente de run al equipo]**; el usuario aprobó que pactos grandes requieran votación, pero no una regla numérica concreta. Si hay empate/abstención, no ejecutar pacto irreversible. Nadie puede aceptar por otro.

## Tentaciones privadas

- Oferta solo visible en viewport/celular del destinatario, pero nunca cifrar información falsa sobre consecuencias.
- `maxTeamImpact` impuesto por servidor, con catálogo cerrado de consecuencias menores.
- Registrar quién aceptó y por qué se disparó; revelación posterior como comentario teatral, opcionalmente atenuable por ajustes sociales/accesibilidad.
- Los jugadores afectados deben poder identificar mecánicamente la amenaza cuando ocurre, aunque no sepan quién la provocó.
- Evitar premiar reiteradamente al jugador que sabotea; hay cooldowns y alternativas altruistas.

## Integración con estado emocional del Director

El mood modifica frecuencia y selección de propuestas dentro de ventanas máximas, **no** altera condiciones una vez ofertadas. Una oferta aceptada se ejecuta como transacción autoritativa con idempotencia y guardado. Las recompensas por completar deben liquidarse una sola vez.

## Control de abuso

- No se aceptan pactos cuando la sala está migrando host o guardando snapshot.
- Coste/recompensa no pueden cambiar tras aceptar, aunque suba el temporizador.
- Pactos pendientes al suspender/reanudar restauran tiempo activo restante y expiración correcta.
- Pactos que afectan a la economía compartida requieren autorización explícita según impacto.
- Moderación social: opción de **silenciar insinuaciones personalizadas** del Director sin desactivar la mecánica.
