# Preparación para publicación

## Estado vigente20/11

Web desplegada y comprobada en Vercel;14 migraciones Supabase aplicadas. Propietario confirma recorrido completo de addons y recuperación de contraseña con cambio correcto. Sandbox Stripe conectado en Production con autorización, secretos backend y webhook HTTPS propio; Preview desactivado. No habilitado modo live. Prueba técnica alojada de caducidad/recibo/duplicado aprobada y prueba manual5€ pendiente. Los apartados inferiores conservan la lista histórica de preparación; ya no describen ausencia de destino Vercel o recuperación sin comprobar. Permanecen dominio canónico, operación/restauración y preparación independiente de aportaciones reales.

Estado 19/11/2026: aplicación y Stripe comprobados localmente en pruebas. No hay publicación ni cobros reales. Aportaciones voluntarias sin compra, funciones exclusivas o ventajas. No se construye un flujo de solicitud de reembolsos; su conciliación y las disputas quedan fuera de esta fase por decisión del propietario.

## Paquete que se debe revisar

Ejecutar `npm ci`, `npm run check` y `npm run check:release`. El último comando inspecciona únicamente el paquete público compilado: documentos esperados, exclusión de ejemplos, ausencia de mapas y claves detectables, robots y configuración SSR. No imprime coincidencias ni valores del entorno. Es una comprobación parcial, no una certificación de ausencia de secretos ni una prueba de Vercel.

El build de distribución es `dist/wow-forever-addons`, nunca `dist/support-preview` ni las otras vistas aisladas. No subir `.env`, referencias, capturas o archivos Lua. El adaptador `npm run start:built` permite revisar el paquete en loopback; sus pruebas no sustituyen las funciones alojadas.

## Antes de cualquier despliegue

1. Elegir dominio y hosting; comprobar plan, límites y condiciones vigentes. Confirmar proyecto Vercel y quién conserva el acceso administrativo. No hay una cuenta o destino Vercel verificado en esta sesión.
2. Separar Development, Preview y Production. Configurar cada ámbito explícitamente; no copiar indiscriminadamente `.env`. Preview debe permanecer noindex y sin cobros reales. Usar datos de desarrollo hasta comprobar el aislamiento.
3. `PUBLIC_SITE_URL`: origen HTTPS definitivo, idéntico en compilación y ejecución para canonicals y sitemap. Sin dominio, se conserva noindex. No usar localhost como dominio público.
4. `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`: configuración pública permitida. Las claves de servidor y `SUPPORT_RECEIPT_SECRET` solo en backend. No insertar secretos en Angular ni variables públicas. Revisar las trece migraciones aplicadas antes de elegir otro proyecto; no ejecutarlas automáticamente contra un destino sin inspección.
5. Configurar dominio de Auth y retornos exactos, correo propio y límites de envío. Recuperación de contraseña sigue pendiente: verificarla de extremo a extremo antes de considerar operable la administración.
6. Primera publicación candidata con `STRIPE_TEST_CHECKOUT_ENABLED=false` y `STRIPE_TEST_WEBHOOK_ENABLED=false`. El código actual admite exclusivamente claves y sesiones de prueba: no basta introducir claves live para activar aportaciones reales.
7. Para probar Stripe alojado, usar sandbox, origen HTTPS exacto y webhook de ese destino con su propio secreto; no copiar el secreto del listener local. Registrar los cuatro eventos Checkout admitidos. La CLI y `stripe:recover` son herramientas locales y no sustituyen la entrega HTTPS de Stripe.

## Aceptación del entorno alojado

Comprobar inicio, catálogo, rutas administrativas directas y errores 404. Validar SSR de una publicación autorizada, retirada 404 y caída del proveedor 503; revisar Sharp con imagen real permitida. Verificar API pública sin claves privadas, caché administrativa, noindex de Preview y canonicals/sitemap del destino definitivo. Revisar MFA, recuperación y Storage con sesión del propietario y limpieza de archivos temporales.

Con aportaciones aún desactivadas, confirmar que se ofrece información y el catálogo sigue accesible. Solo después, si se habilita sandbox alojado, repetir pago ficticio, rechazo, 3DS, retorno confirmado, firma inválida y duplicados por el webhook HTTPS. Revisar entregas fallidas y latencia sin guardar payload, contactos o URLs de sesión en logs. No se ha realizado esta validación alojada.

## Incidencias y reversión

Conservar el despliegue anterior validado y registrar versión del código, migraciones compatibles y variables por ámbito sin sus valores. Ante problemas de Checkout, desactivar nuevas sesiones mediante el flag de Checkout y volver a desplegar la configuración; mantener recepción del webhook y consulta de recibos para las sesiones existentes cuando sea seguro. Una reversión de frontend no revierte una migración de base de datos, archivos o cambios externos.

En Vercel, verificar disponibilidad y límites de Instant Rollback en el plan elegido y ensayar retorno al despliegue anterior en Preview. Confirmar después catálogo, SSR, acceso y recepción de eventos. Si el error afecta claves o integridad, tratarlo como incidencia del proveedor y conservar evidencia mínima; no repetir pagos para resolver una confirmación pendiente. Copias y restauración de base de datos/Storage requieren un ensayo independiente antes del lanzamiento.

Referencias oficiales revisadas: [entornos Vercel](https://vercel.com/docs/deployments/environments), [Instant Rollback](https://vercel.com/docs/instant-rollback), [webhooks Stripe](https://docs.stripe.com/webhooks). No se ha elegido ni contratado plan.
