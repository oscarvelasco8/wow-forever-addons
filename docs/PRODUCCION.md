> Estado vigente 21/11/2026: cuenta Stripe cerrada por el titular. Integración retirada, endpoints antiguos responden 410. Apoyo público solo mediante PayPal.Me externo; las notas de Stripe siguientes son históricas.

# Preparación para publicación

## Estado operativo vigente — 21/11/2026

- Web en Vercel Production. `main` commit `023e9be` con estado Vercel success; smoke público18/18 PASS tras el despliegue. Dominio canónico aún sin fijar; `/sitemap.xml` responde503 y no se publica canonical definitivo.
- Proyecto Supabase `wow-forever-addons` activo y saludable, PostgreSQL17 en `eu-west-1`; organización en plan Free. En el plan Free no hay copias diarias automáticas. Supabase recomienda exportar con CLI y guardar fuera del proyecto; una copia SQL no incluye objetos de Storage. No se ha generado exportación ni ensayado restauración. Para hacerlo falta elegir destino de almacenamiento protegido y verificar el inventario/recuperación de objetos.
- `npm.cmd audit --omit=dev`: cero vulnerabilidades informadas en dependencias de producción. Vercel conserva solo `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`; no se han consultado valores.
- Stripe se cerró y su integración, endpoints activos y variables se retiraron. La preparación live de Stripe que aparece abajo es histórica y queda cancelada; no reconfigurar ni activar.
- El Owner nuevo de Supabase y login web con MFA están verificados. Owner personal previo permanece hasta autorización específica. Recuperación de contraseña continúa aplazada.
- Referencias: [copias de base de datos Supabase](https://supabase.com/docs/guides/platform/backups) y [FAQ de copias del plan Free](https://supabase.com/kb/faqs/platform/free-plan-backups), consultadas21/11/2026.

La sección de preparación para Stripe y las listas de despliegue que siguen reflejan el plan previo a la migración y cierre del servicio; prevalece este estado vigente. Las acciones genéricas de restauración siguen pendientes y deben prepararse con una copia externa antes de cualquier ensayo.

## Histórico — preparación live Stripe20/11, cancelada

Propietario confirma que solo ha utilizado sandbox. Inspección de cuenta real: Activar Payments, verificación del titular/actividad, banco, seguridad y revisión sin iniciar. Se entrega pantalla al titular; el agente no introduce información financiera, acepta contratos ni envía activación. No se han obtenido claves live ni cambiado la configuración alojada.

La implementación actual NO admite dinero real: clave, prefijo de sesión, metadatos, recibo, ledger, cuota e interfaz están vinculados al sandbox. La preparación técnica siguiente debe cubrir todo el recorrido, manteniendo pruebas operativas:

1. Configuración real independiente y desactivada por defecto; claves restringidas de servidor cuando sus permisos cubran la integración, origen HTTPS fijo y comprobación de cuenta habilitada. Nunca reutilizar secretos del sandbox o mezclar modos por inferencia del cliente.
2. Ledger y cuota reales separados de `private.support_test_*`, RPC solo backend, RLS y pruebas de idempotencia/precedencia; no convertir registros ficticios en aportaciones reales.
3. Destino de webhook live propio con validación de livemode y metadatos reales, mismo tratamiento del cuerpo firmado y persistencia antes de HTTP200. Recibos ligados al modo, firma independiente y lectura del ledger correcto.
4. Frontend con información real de aportación voluntaria, importes y confirmación basada en webhook; conservar experiencia test identificada. No desbloqueos por pago.
5. Validación local con transportes controlados, revisión visual y configuración backend Production por separado. Después de activación del titular, comprobar disponibilidad y webhook reales sin cobrar automáticamente; cualquier primera aportación real la realiza el propietario voluntariamente.

Esta lista es diseño de implementación, NO soporte live ya implementado. Próximo requisito externo: titular completa la activación en Stripe y confirma si Payments está habilitado o en revisión. No pedir claves, documentos, datos bancarios o códigos por chat. Documentación oficial revisada: [activación](https://docs.stripe.com/get-started/account/set-up), [claves y separación de entornos](https://docs.stripe.com/keys).

## Histórico — estado de despliegue anterior20/11

Web desplegada y comprobada en Vercel;14 migraciones Supabase aplicadas. Propietario confirma recorrido completo de addons y recuperación de contraseña con cambio correcto. Sandbox Stripe conectado en Production con autorización, secretos backend y webhook HTTPS propio; Preview desactivado. No habilitado modo live. Prueba técnica alojada de caducidad/recibo/duplicado aprobada y prueba manual5€ pendiente. Los apartados inferiores conservan la lista histórica de preparación; ya no describen ausencia de destino Vercel o recuperación sin comprobar. Permanecen dominio canónico, operación/restauración y preparación independiente de aportaciones reales.

Estado 19/11/2026: aplicación y Stripe comprobados localmente en pruebas. No hay publicación ni cobros reales. Aportaciones voluntarias sin compra, funciones exclusivas o ventajas. No se construye un flujo de solicitud de reembolsos; su conciliación y las disputas quedan fuera de esta fase por decisión del propietario.

## Paquete que se debe revisar

Ejecutar `npm ci`, `npm run check` y `npm run check:release`. El último comando inspecciona únicamente el paquete público compilado: documentos esperados, exclusión de ejemplos, ausencia de mapas y claves detectables, robots y configuración SSR. No imprime coincidencias ni valores del entorno. Es una comprobación parcial, no una certificación de ausencia de secretos ni una prueba de Vercel.

El build de distribución es `dist/wow-forever-addons`, nunca `dist/support-preview` ni las otras vistas aisladas. No subir `.env`, referencias, capturas o archivos Lua. El adaptador `npm run start:built` permite revisar el paquete en loopback; sus pruebas no sustituyen las funciones alojadas.

## Lista histórica previa a Vercel — revisar antes de reutilizar

1. Elegir dominio y hosting; comprobar plan, límites y condiciones vigentes. Confirmar proyecto Vercel y quién conserva el acceso administrativo. No hay una cuenta o destino Vercel verificado en esta sesión.
2. Separar Development, Preview y Production. Configurar cada ámbito explícitamente; no copiar indiscriminadamente `.env`. Preview debe permanecer noindex y sin cobros reales. Usar datos de desarrollo hasta comprobar el aislamiento.
3. `PUBLIC_SITE_URL`: origen HTTPS definitivo, idéntico en compilación y ejecución para canonicals y sitemap. Sin dominio, se conserva noindex. No usar localhost como dominio público.
4. `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`: configuración pública permitida. Las claves de servidor y `SUPPORT_RECEIPT_SECRET` solo en backend. No insertar secretos en Angular ni variables públicas. Revisar las trece migraciones aplicadas antes de elegir otro proyecto; no ejecutarlas automáticamente contra un destino sin inspección.
5. Configurar dominio de Auth y retornos exactos, correo propio y límites de envío. Recuperación de contraseña sigue pendiente: verificarla de extremo a extremo antes de considerar operable la administración.
6. Primera publicación candidata con `STRIPE_TEST_CHECKOUT_ENABLED=false` y `STRIPE_TEST_WEBHOOK_ENABLED=false`. El código actual admite exclusivamente claves y sesiones de prueba: no basta introducir claves live para activar aportaciones reales.
7. Para probar Stripe alojado, usar sandbox, origen HTTPS exacto y webhook de ese destino con su propio secreto; no copiar el secreto del listener local. Registrar los cuatro eventos Checkout admitidos. La CLI y `stripe:recover` son herramientas locales y no sustituyen la entrega HTTPS de Stripe.

## Lista de aceptación alojada — estado parcial

Comprobar inicio, catálogo, rutas administrativas directas y errores 404. Validar SSR de una publicación autorizada, retirada 404 y caída del proveedor 503; revisar Sharp con imagen real permitida. Verificar API pública sin claves privadas, caché administrativa, noindex de Preview y canonicals/sitemap del destino definitivo. Revisar MFA, recuperación y Storage con sesión del propietario y limpieza de archivos temporales.

Smoke público actual18/18 PASS confirma las rutas y estados listados en `scripts/verify-hosted.mjs`, incluidos endpoints antiguos Stripe410. Las pruebas alojadas de pago sandbox se completaron antes de retirar Stripe y constan en `docs/MEMORIA.md`; no se repiten ni se trata el sandbox histórico como canal vigente. Este smoke no certifica recuperación de contraseña, restauración, Storage completa, costes ni revisión visual de esta sesión.

## Lista histórica de incidencias y reversión

Conservar el despliegue anterior validado y registrar versión del código, migraciones compatibles y variables por ámbito sin sus valores. Ante problemas de Checkout, desactivar nuevas sesiones mediante el flag de Checkout y volver a desplegar la configuración; mantener recepción del webhook y consulta de recibos para las sesiones existentes cuando sea seguro. Una reversión de frontend no revierte una migración de base de datos, archivos o cambios externos.

En Vercel, verificar disponibilidad y límites de Instant Rollback en el plan elegido y ensayar retorno al despliegue anterior en Preview. Confirmar después catálogo, SSR, acceso y recepción de eventos. Si el error afecta claves o integridad, tratarlo como incidencia del proveedor y conservar evidencia mínima; no repetir pagos para resolver una confirmación pendiente. Copias y restauración de base de datos/Storage requieren un ensayo independiente antes del lanzamiento.

Referencias oficiales revisadas: [entornos Vercel](https://vercel.com/docs/deployments/environments), [Instant Rollback](https://vercel.com/docs/instant-rollback), [webhooks Stripe](https://docs.stripe.com/webhooks). No se ha elegido ni contratado plan.
