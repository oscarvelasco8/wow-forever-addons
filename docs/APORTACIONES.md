# Aportaciones voluntarias — preparación local

## Estado vigente20/11: sandbox alojado

Vercel Production ya sirve Checkout de pruebas y recibe los cuatro eventos Checkout por un webhook HTTPS independiente del listener local. Secretos backend limitados a Production; Preview desactivado. Solo se admiten sesiones test, sin cobros reales. Primera prueba técnica alojada sin pago: caducidad entregada automáticamente y registrada, recibo HTTP200 expired, repetición HTTP200 duplicate, petición sin firma400. Ledger mantiene3 pagos simulados previos/1300 céntimos. Pago manual alojado5€ solicitado al propietario, pendiente de corroboración.

Comprobación pública: `node scripts/verify-hosted.mjs https://wow-forever-addons.vercel.app/ --sandbox` (18/18). Sin flag exige Checkout desactivado. Captura real `fase6-sandbox-vercel-real.jpg`. Los bloques siguientes son históricos; no repetir creación de webhook ni copiar secretos locales de listener.

## Retorno confirmado y recuperación local — vigente 19/11

- Propietario confirma nueva prueba independiente de 3 €: «Aportación de prueba confirmada» e importe correcto. Backend remoto conserva tres pagos simulados (1.300 céntimos EUR); siete sesiones técnicas caducadas, diez sesiones/eventos. Sin dinero real ni despliegue.
- Retorno consulta exclusivamente el registro persistido por webhook. Recibo HMAC limitado a sesión e importe, caducidad de dos horas, guardado en sessionStorage; no va en URL. El identificador de retorno se limpia del historial. Son cinco consultas automáticas como máximo y reintento manual de consulta. Falta de prueba, error o demora nunca confirman pago ni generan otro Checkout. Formulario oculto durante el resultado; retorno no indexable.
- Aplicada selectivamente la decimotercera migración 20261119172251_support_receipt_status. RPC invoker accesible solo por service_role; devuelve estado, importe y moneda. Tipos remotos regenerados. Nueva SUPPORT_RECEIPT_SECRET aleatoria local ignorada, sin registrar su valor. Sin nuevas tablas ni privilegios del visitante.
- Recuperación real de evento sandbox: detenido únicamente listener propio; creada sesión técnica de 3 € sin pagar y caducada con API Stripe. Consulta devolvió pending mientras estaba desconectado. Listener reiniciado; recuperación manual de ventana 60 minutos: recorded=1, duplicate=9, failed=0. Segunda pasada: recorded=0, duplicate=10, failed=0. Consulta posterior expired. Pagos permanecen tres. No equivale a reintentos automáticos cloud de Stripe.
- npm run check PASS: 20 API, 24 SQL, 80 Angular, 1 SSR; siete rutas prerender. Typecheck posterior a regenerar tipos PASS. Primer intento técnico encontró reinicio del watcher (ECONNRESET), sin crear sesión; se repitió tras verificar puertos. Ruta de compilación visual corregida ejecutando desde scripts/visual.
- Herramientas operativas: npm run stripe:listen y npm run stripe:recover -- 60. Recuperación solo loopback, claves test, eventos propios; verifica firma antes de recuperar y no imprime payload/IDs/contactos. Mantener API y listener activos. Capturas de retorno se preparan como vistas con datos de ejemplo, separadas de la prueba real del propietario. Capturas anteriores conservadas.
- Siguiente: revisión integral de preparación para producción (conciliación de reembolsos/disputas, operación webhook alojado y configuración Vercel). Recuperación de contraseña sigue pendiente. No activar cobros reales ni declarar cerrada la fase 6. Sin commit, push o Lua.



## Estado vigente: sandbox conectado y pruebas reales19/11

Captura del informe actual: docs/capturas/fase6-stripe-rechazo-3ds-informe.jpg. Muestra resultados corroborados de rechazo, desafío y webhook; no es una captura Dashboard ni contiene claves. HTML fuente fase6-stripe-validacion.html conservado.

Doce migraciones remotas/locales alineadas, ninguna de las antiguas pendientes. Credenciales introducidas por propietario en .env ignorado; claves nunca incluidas en documentación, frontend o argumentos CLI. Checkout/webhook TEST activos localmente con listener oficial. Esto prevalece sobre los bloques históricos inferiores que dicen sin cuenta, desactivado o migraciones pendientes. No hay despliegue ni modo live.

Propietario completó pago sencillo5€ y desafío 3DS para otro pago5€. Stripe API confirma authenticated/challenge2.1.0 y PaymentIntent succeeded en el segundo. Supabase paid2/total1000 céntimos ficticios; cinco sesiones técnicas expiradas sin pagar, siete sesiones/eventos. Rechazo intermedio comprobado en Checkout y API como card_declined/generic_decline, unpaid/requires_payment_method, sin aumentar el primer paid. No confundir rechazo inmediato con async_payment_failed. Reentrega manual firmada de eventos reales devuelve200 duplicate sin nuevas filas.

Compatibilidad corregida para URL Stripe c/pay y g/pay, manteniendo HTTPS/host fijo/ID exacto/livemodefalse. Regresión cubierta; check17 API,24 SQL,77 Angular,1 SSR. Informe de resultados en docs/capturas/fase6-stripe-validacion.html, sin capturas de claves o datos personales. Retorno aún no consulta estado y por eso muestra pendiente aunque el webhook confirme; siguiente mejora. También pendiente recuperación listener, conciliación de disputas/reembolsos y validación Vercel/producción. Nada de dinero real.

Estado global posterior: protección de archivos aplicada selectivamente como novena migración20261119144321. Once archivos locales y SOLO las dos migraciones Stripe siguen pendientes. No se aplicaron webhook/cuota ni se configuraron claves Stripe. Las cifras de ocho remotas en bloques históricos inferiores preceden a esta protección.

## Control de uso y operación: estado actualizado19/11

Antes de crear una sesión Stripe se exige admisión en PostgreSQL compartido:6 peticiones válidas por minuto de reloj y30 por hora de reloj, para toda la plataforma. Son ventanas fijas, no límites deslizantes ni por persona; puede haber ráfagas al cambiar ventana. No se conserva IP, huella o cookie ni se confía en cabeceras reenviadas. Un atacante puede agotar cuota para todos: este tope protege el uso de Stripe, no garantiza disponibilidad frente a ataques de red. WAF/rate limiting del alojamiento pendientes de revisar antes de exponerlo públicamente.

Migración20261119132832_support_checkout_budget SOLO local, NO aplicada; ocho migraciones remotas y diez archivos locales (webhook+cuota pendientes). Tabla privada RLS y RPC admit_support_test_checkout SECURITY INVOKER solo service_role. Bloqueo global transaccional, admisión e incremento de ambas ventanas atómicos; denegación no incrementa. Limpia contadores de más de24h al evaluar nuevas peticiones; no hay borrado de aportaciones. Sin fallback en memoria. Solicitudes inválidas se rechazan antes de consultar la cuota; cada solicitud válida admitida consume presupuesto, incluidos reintentos y errores posteriores Stripe.

API429 + Retry-After1..3600 al agotar;503 ante RPC no disponible o respuesta incoherente, sin llamar a Stripe. Navegador conserva UUID, muestra espera, desactiva importe/botón y no reintenta automáticamente; al finalizar permite intento manual. Saltarse ese botón no evita la comprobación en servidor. El webhook no comparte este contador: conserva firma/límites de cuerpo para no impedir reentregas legítimas.

Checkout únicamente se declara configurado si tiene además webhook habilitado con secreto test válido y credencial backend para ledger/cuota. GET refleja presencia/validez de configuración, no disponibilidad efectiva de la base. Si falla protección al POST, permanece cerrado. Todas las variables reales siguen sin configurar, no se obtuvo credencial alguna y ambos endpoints permanecen desactivados. No activar hasta revisar/aplicar las dos migraciones pendientes y probar RPC/Stripe/runtime remotos.

Validación vigente: check15 API,23 SQL contando contenedor,72 Angular,1 SSR; siete prerender, más revalidación Support3/build/SSR tras texto final. Contador probado en PostgreSQL PGlite; no es benchmark ni prueba multiproceso remota. Preview support-limit devuelve429 ficticio y configura disponibilidad simulada, sin Stripe/Supabase. Capturas fase6-limite-checkout-preview-{escritorio,movil}.jpg, móvil320/390px sin overflow. Referencias: [bloqueos transaccionales PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html), [idempotencia Stripe](https://docs.stripe.com/api/idempotent_requests).

### Operación antes de conectar sandbox

- Mantener STRIPE_TEST_CHECKOUT_ENABLED=false para cortar nuevas sesiones en todas las instancias; reiniciar desarrollo o desplegar configuración actualizada según alojamiento. No desactivar webhook por una incidencia de Checkout: puede haber eventos pendientes.
- Si webhook/persistencia fallan, restaurar conexión y comprobar reentregas/duplicados. No responder éxito manualmente ni borrar historial para que desaparezca el error. Si es necesario desactivar webhook, Stripe recibirá503 y quedará pendiente revisar/reentregar eventos al restaurarlo.
- Revisar tasas de429 y503 y entregas en Stripe cuando exista cuenta. No registrar cuerpos completos, correos, cabeceras de firma, claves o URL de sesión. Observabilidad/alertas del alojamiento aún sin configurar.
- Probar por separado saturación de cuota, restauración de base, evento duplicado y cancelación/rechazo antes de activar una prueba pública. El retorno del navegador sigue sin confirmar pago. No hay interruptor live.

Próximo bloqueo externo: crear cuenta/sandbox con el propietario cuando esté disponible, aplicar migraciones revisadas, configurar secretos solo backend y comprobar integración real. La preparación local no cierra fase6 ni constituye despliegue. Los bloques inferiores se conservan como historial; prevalece este estado.

## Estado actualizado: webhook local19/11

El propietario todavía no tiene Stripe. Este bloque prevalece sobre las tareas pendientes históricas inferiores. Checkout y webhook siguen desactivados; no se obtuvieron claves ni hubo cobros o conexiones reales a Stripe.

POST /api/support-webhook verifica Buffer original con SDK Stripe antes de parsear, firma±300s y límite256KiB. Cabecera de firma máximo2048 caracteres. Solo eventos checkout.session.completed/expired/async_payment_succeeded/async_payment_failed con livemode=false y metadatos integration=wfa_support_v1/purpose=platform_support_test. Comprueba sesión test, estado coherente e importes EUR permitidos. Ajenos200 ignored sin escritura; inválidos400. La integración solo ofrece tarjeta; estados asíncronos cubiertos defensivamente.

Migración20261119130159_support_webhook_ledger.sql preparada y comprobada SOLO localmente, NO aplicada al servidor: ocho migraciones remotas/nueve archivos locales. Crea tablas private.support_test_sessions/events con RLS, sin acceso anon/authenticated, incluido admin. RPC record_support_test_event SECURITY INVOKER, search_path vacío, EXECUTE solo service_role. Grants privados backend limitados a operaciones necesarias, sin DELETE. Sin correo, tarjeta o payload completo; solo IDs,importe,moneda,estado y fechas técnicas. Sin permisos o ventajas asociados al catálogo.

Registro/actualización en una transacción con bloqueo por evento y fila de sesión; duplicados iguales devuelven duplicate sin filas nuevas, conflicto revierte. Precedencia pending→expired→failed→paid; paid no retrocede. Esta confirmación inicial no es conciliación de reembolsos o disputas, aún no procesados. HTTP200 únicamente tras persistir/duplicado;503 ante fallo permite reentrega. No existe endpoint de consulta pública.

Nuevas variables solo backend: STRIPE_TEST_WEBHOOK_ENABLED=false, STRIPE_TEST_WEBHOOK_SECRET y SUPABASE_WEBHOOK_SECRET_KEY vacías. El adaptador espera clave Supabase sb_secret dedicada en apikey, no Authorization/cookies del visitante. No se obtuvo ni configuró una clave real. bodyParser:false preparado, manejo de bytes originales en Vercel aún sin validar.

Validación vigente: npm.cmd run check PASS14 API,22 SQL contando contenedor,71 Angular,1 SSR; siete prerender. npm.cmd run verify:webhook:local PASS6 comprobaciones integradas: HTTP real loopback→firma sintética→RPC simulado→PostgreSQL PGlite persistente, cierre/reapertura y recuperación503→200. Informe generado solo tras assertions, con capturas fase6-webhook-informe-{escritorio,movil}.jpg. No prueba Stripe, PostgREST remoto, concurrencia multiproceso o runtime Vercel. Tipos remotos sin regenerar. Las pruebas base de Checkout descritas debajo siguen vigentes como evidencia histórica.

Siguiente: controles de abuso/operación, migración remota revisada y RPC con credencial backend cuando exista sandbox; después flujo integral, cancelación/rechazo/duplicados y runtime Vercel. No activar públicamente. Fase6 abierta.

WoW Forever Addons recibe apoyo a la plataforma, sin acceso, ventajas ni suscripción. Todos los addons siguen siendo gratuitos. No se presenta como donativo benéfico ni se promete desgravación fiscal.

## Bloque preparado

`/apoyar` muestra disponibilidad obtenida del backend. Por defecto no acepta dinero ni ofrece un botón de pago. El HTML prerenderizado también muestra el estado desactivado; sin JavaScript nunca se promete una operación disponible.

`GET /api/support-checkout` devuelve únicamente disponibilidad, modo test, moneda EUR e importes. `POST` acepta exclusivamente300,500,1000 o2000 céntimos y un UUIDv4 por intento. No recibe correo, tarjeta, destino de retorno, precio Stripe ni identificador de addon. Requiere Origin igual al origen configurado, JSON y cuerpo máximo1024 bytes. No reenvía cookies ni sesión Supabase. Host del solicitante no decide los retornos.

El backend usa Stripe23.2.0, API2026-11-18.endive. La versión actual del SDK llama al parámetro `allowed_payment_method_types`; se comprueba el transporte serializado en tests. Checkout puntual con tarjeta, sin suscripción, cliente creado explícitamente ni permisos asociados. Todas las llamadas llevan clave de idempotencia por intento; ante fallo incierto el navegador conserva UUID e importe. Cambiar importe crea otro intento. No hay reintentos automáticos del SDK. Timeout10s servidor y15s navegador. Solo se devuelve una sesión cs_test con livemode=false y URL HTTPS checkout.stripe.com/c/pay/cs_test_…; destino inesperado falla cerrado.

## Configuración pendiente del propietario

Variables solo backend, documentadas vacías en `.env.example`:

- STRIPE_TEST_CHECKOUT_ENABLED: false por defecto; activación explícita para revisión local.
- STRIPE_TEST_SECRET_KEY: únicamente clave sk_test del entorno de pruebas, nunca en conversación, frontend o capturas. Claves live rechazadas.
- STRIPE_TEST_SITE_URL: origen fijo de la web, HTTPS o HTTP loopback local. Debe coincidir exactamente con la dirección usada en el navegador; no usar la IP LAN con HTTP. Para pruebas locales se recomienda http://localhost:4200.

No se han obtenido claves, accedido a cuenta Stripe, creado sesiones reales ni realizado cobros. La pregunta sobre disponibilidad de cuenta está pendiente. No activar públicamente este bloque: faltan webhook persistente, controles de abuso/rate limit y prueba integral. No existe interruptor para cobros live en esta implementación.

## Verificación y siguiente bloque

`npm.cmd run check`:12 API,21 SQL contando contenedor,71 Angular,1 SSR compilada; siete prerender. API con transporte Stripe controlado comprueba importes, Origin, JSON/tamaño, idempotencia, serialización SDK y rechazo de claves live/sesiones inseguras. Angular verifica indisponibilidad, reintento y rechazo de redirección externa. `npm install --save-exact stripe@23.2.0`:318 paquetes auditados,0 vulnerabilidades. Las advertencias existentes de scripts de instalación no se aprobaron adicionalmente.

HTTP local real sin configuración: GET200 enabled=false. Preview aislada de componentes reales en scripts/visual: configuración ficticia activada, POST503 deliberado sin conexión Stripe; selección10€ y reintento visibles, sin overflow320/390px. Capturas fase6-checkout-preview-escritorio.jpg y fase6-checkout-preview-movil.jpg. No muestran un Checkout alojado en Stripe ni validan un pago.

Próximo: webhook con cuerpo original y firma/tolerancia temporal, registro privado persistente e idempotencia transaccional, sin payloads personales innecesarios. Considerar entregas duplicadas/desordenadas y fallos de almacenamiento; no responder éxito antes de persistir. Solo después, conectar sandbox y verificar éxito, cancelación, rechazo, reintento y webhook duplicado. El retorno `checkout=return` nunca confirma pago; informa verificación pendiente. Fase6 abierta.

Referencias oficiales consultadas: [Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/create), [idempotencia](https://docs.stripe.com/api/idempotent_requests), [entornos de pruebas](https://docs.stripe.com/testing), [webhooks y firmas](https://docs.stripe.com/events/manage-webhook-endpoints). No usar tarjetas reales en pruebas.


Decisión vigente19/11: no añadir flujo de solicitud de reembolsos; conciliación de devoluciones/disputas fuera de esta fase. Continuar preparación técnica en docs/PRODUCCION.md, manteniendo solo sandbox.

Confirmación posterior20/11: pago alojado5€ aprobado de extremo a extremo (usuario, pantalla real, Stripe y ledger); paid4/1800 céntimos ficticios,8 expiradas. Captura fase6-pago5-confirmado-vercel-real.jpg. Falta completar3DS y rechazo alojados para cerrar aceptación sandbox; no activar live.
