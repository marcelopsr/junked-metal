# Seguridad, privacidad y resiliencia

## Superficies de ataque

Tokens QR/código de pairing, sesiones online, señales WebRTC, voto remoto, APIs de items/scrap, snapshots de estado, perfiles persistentes, pantallas receptoras de pactos privados, host migration y reportes de eventos.

## Reglas

- Autorizar **por rol**: espectador solo recibe video permitido; controlador emite input solo para participantId asignado; host confirma pairing/cambio de rol.
- Tokens efímeros (TTL, un solo uso, revocables), conexión cifrada donde corresponda, límites de intentos y registro de eventos de pairing.
- La UI de pactos secretos no puede transmitirse por error a espectadores o viewports de otros usuarios.
- Toda compra, recompensa, XP, cambio de mapa y elección de boss se valida en autoridad con idempotencia.
- Migración de host usa epochs y quorum/arbitraje para evitar doble autoridad; P2P no asegura anticheat perfecto y debe explicarse en documentación técnica.
- Guardar solo metadatos narrativos necesarios; no retener video/voz de cámaras remotas por defecto.
- Sustituir nombres de dispositivo/usuario por alias seguros en logs, siempre con posibilidad de depuración con consentimiento.

## UX segura

Botones de «Desvincular», «Expulsar pantalla», «Silenciar revelaciones personales», «Eliminar datos narrativos» [función propuesta], «Revisar sesiones». No revelar contraseña/código de sala en streaming visible públicamente si compromete acceso.

## Riesgos específicos

- **Denegación de servicio por videos:** limitar streams y bitrate.
- **Abuso de chat/locución social:** mensajes del Director basados en hechos, no suposiciones sobre personas reales.
- **Dupe de ítems:** transaction IDs e inventario reconciliado.
- **Replay de QR/código:** expiración + autorización + nonce.
- **Host malicioso:** modelo P2P host-authoritative no es igual de seguro que servidor dedicado; las recompensas permanentes deberían validarse mediante backend si tienen valor externo o competitivo.
