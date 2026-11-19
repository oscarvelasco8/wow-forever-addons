# Arquitectura de la base

## Revisiones de archivos19/11

Nueva ruta addonUUID/entidadUUID/revisionUUID.ext, sin sobrescritura. RPC invoker con CAS asocia nuevo objeto/retira viejo; trigger bloquea rutas publicadas y reutilización de retirados; Storage restrictivo protege referencias y permite limpieza solo retirada/no referenciada. Retiro+metadatos atómicos, borrado físico vía API posterior y reintentable. Estado de contrato/pendientes evita blobs si falta migración. Paths planos públicos compatibles. Migración20261119144321 aplicada selectivamente, tipos regenerados: nueve remotas/once archivos locales, dos Stripe pendientes. SQL remoto con ROLLBACK aprobado sin blobs; HTTP de nueva gestión pendiente. Ver ARCHIVOS.md.

## Cuota compartida de Checkout19/11

API exige admisión de PostgreSQL antes de sesión Stripe, tras validar cuerpo/origen/importe. RPC invoker solo service_role:6/minuto y30/hora por ventanas fijas globales, bloqueo transaccional, limpieza24h y sin identificadores personales.429 Retry-After o503 sin Stripe ante error; no fallback local. Config ledger común a webhook y contador, disponibilidad requiere webhook configurado. Migración20261119132832_support_checkout_budget pendiente junto al ledger: ocho remotas/diez archivos locales. No es WAF ni cuota por visitante; servidor aplica control aunque se omita cuenta atrás del cliente. Runbook y límites en APORTACIONES.md.

## Webhook de pruebas local19/11

API Node verifica firma Stripe sobre bytes originales y±300s; proyecta únicamente campos técnicos permitidos. RPC invoker solo service_role registra atómicamente en tablas privadas con RLS, deduplica por ID y conserva paid ante eventos tardíos. Sin datos de contacto/tarjeta o privilegios de catálogo. Migración20261119130159_support_webhook_ledger preparada localmente, no aplicada; ocho remotas/nueve archivos locales. Adaptador secret backend sin configurar. No hay consultas públicas ni UI de aportaciones confirmadas. Ver APORTACIONES.md para pruebas locales, límites y trabajo remoto pendiente.

## Checkout de pruebas — preparación19/11

Support consulta /api/support-checkout en navegador. API Node usa SDK Stripe23.2.0/API2026-11-18.endive exclusivamente con claves test y configuración explícita, desactivada inicialmente. POST sin sesión admite importes permitidos+UUID; origen/retornos fijos, cuerpo acotado e idempotencia Stripe por intento. No recibe datos de tarjeta, correo o addon. Solo URL HTTPS Checkout/sesión test validada. Sin webhook o persistencia todavía; retorno no confirma pago. Sin modo live. Ver APORTACIONES.md para configuración, evidencia y bloqueos antes de habilitar públicamente.

## Rendimiento vigente — 19/11

Este bloque prevalece sobre las referencias históricas al catálogo completo y miniaturas originales. GET /api/catalog devuelve12 resúmenes, categorías públicas y nextCursor; RPC catalog_page invoker selecciona13 claves y un segundo GET acotado resuelve12 resúmenes bajo RLS anónima. Filtros/cursor validados; sin campos largos. GET /api/addon?slug=... devuelve una ficha completa, también usada por SSR y transferida a PublicAddonDetail. Sitemap usa páginas de200 slugs, máximo49997 productos antes de requerir índice; categorías guard5000. Los límites producen error, nunca una lista truncada declarada completa.

Octava migración20261119112302_catalog_pagination: búsqueda literal con plegado de acentos comunes y keyset(nombre,slug), índice parcial publicado y permisos de lectura sin ampliación de escrituras. Catálogo cambiante no garantiza snapshot entre páginas; cliente deduplica. Sin búsqueda fulltext o benchmark de carga grande.

Imágenes: size thumb/card/display solicita WebP320/640/1280 mediante Sharp0.35.5 en Node; validación de formato, límites de bytes/píxeles/tiempo, orientación y eliminación de metadatos, primer fotograma estático, sin ampliar. Firma anónima y nueva comprobación RLS; descarga fuente sin redirecciones externas y respuesta no-store. Original conservado y303 TTL60 sin size. No hay almacenamiento derivado ni caché persistente. Empaquetado nativo Sharp en Vercel pendiente de prueba; configuración preparada sin despliegue.

## Arquitectura vigente — SSR híbrido19/11

Prevalece sobre las secciones históricas de salida estática/CSR de fichas: Angular outputMode server con src/server.ts exportando renderPage, renderizado dinámico de fichas y snapshot público TransferState, siete rutas prerenderizadas y administración CSR. Node /api/render consume bundles dist/.../server y browser; Vercel includeFiles y rewrite preparados, pendientes de validación real. Sin Supabase en build ni sesión administrativa en SSR. PUBLIC_SITE_URL explícito para canonical/sitemap; noindex hasta configurarlo. Ver CALIDAD.md para límites y evidencia.


## Orden y administración de categorías19/11

categories.sort_order con valor0 inicial y CHECK>=0. PublicAddon añade categorySlug/categoryOrder; filtro público ordenado por orden/nombre/slug y selección por slug. Categorías sin publicaciones no aparecen. save_category invoker administra guardados con bloqueo y concurrencia updated_at; creación solo oculta. Auditoría privada extiende editorial_events a categorías con addon_id nullable. Permisos base no ampliados. Migración20261119100814, tipos remotos regenerados, siete migraciones.


## Galería pública — actualización19/11

PublicAddon incluye images(id,altText) desde consulta anónima ordenada y filtrada. Componente AddonGallery controla selección/carga/error/reintento y presenta miniaturas sin URL remota suministrada por metadatos. GET /api/image valida metadatos públicos y ruta canónica antes de firma anónimaTTL60s y303. Nunca usa sesión admin ni clave privilegiada. API sin caché; no hay revocación de bytes ya descargados. Miniaturas usan original; derivados/optimización pendientes. Sin migraciones.


## Gestión editorial y auditoría — actualización19/11

Nueva página editorial diferida y gateway con getUser/admin_access en cada acción. RPC editorial_action SECURITY INVOKER conserva RLS, bloquea padre/hijo y comprueba updated_at; transición y evento se guardan en una transacción. Trigger privado con privilegio limitado al propósito de añadir historial; tabla editorial_events solo lectura admin+aal2. Sin claves privilegiadas en cliente ni backend. Metadatos de auditoría sin textos largos ni Auth payloads. Migración20261119074101, seis totales. UI de confirmación, motivos y guard de salida; revisión real con sesión del propietario pendiente. Sin despliegue.


## Actualización: creación de versiones y archivos privados

Ruta CSR /administracion/addons/:id/archivos con guard admin/MFA y cambios sin guardar. Gateway difiere admin-assets.ts, que valida archivos, crea versiones draft y sube objetos canónicos sin upsert. Escritura de metadatos con control de concurrencia y reconciliación de respuestas inciertas antes de limpiar objetos nuevos. No se tocan RLS ni migraciones. Nuevas dependencias exactas y diferidas fflate0.8.3 (índice ZIP sin inflar) y noble-hashes2.4.0 (SHA256 compatible con HTTP LAN).

Límites50MiB ZIP/5MiB imágenes; índice ZIP con rutas relativas/manifiesto/10000 entradas/250MiB expandido declarado. No comprueba íntegramente los flujos comprimidos ni sustituye revisión de paquete. PNG/JPEG/WebP decodificables,8192px/lado y32MP. Privadas, con alt/orden y previsualización por blob sin URL firmada en DOM. Falta galería pública y gestión editorial/eliminación/reemplazo de contenido real.

## Actualización: edición administrativa de borradores

Cinco migraciones remotas; la nueva 20261118225704 añade instrucciones por addon, con texto plano y máximo 30000 caracteres. UI diferida /administracion/addons/:id bajo adminGuard y guard de cambios sin guardar. Gateway revalida getUser/admin_access en cada operación; admin-drafts.ts limita payloads y filtra escrituras por id/estado draft/updated_at. Ficha y versión se guardan por separado. Edición concurrente devuelve conflicto sin perder el texto. No se cambian aprobación/publicación ni archivos.

Panel real de listado y editor, noindex/nofollow y vista previa privada. No se han implementado todavía creación/subidas/galería/ZIP/publicación/auditoría. Recuperación permanece sin resolver. Guardados y concurrencia verificados con fixture HTTP real eliminado al terminar; Rumbo intacto. Rewrite Vercel nuevo preparado, sin desplegar.

## Actualización: integración pública

Inicio, catálogo y fichas /addons/:slug consumen PublicCatalog, que solicita GET /api/catalog tras el primer render. Se han eliminado los metadatos locales de Rumbo. API consulta Supabase con publishable key y RLS anónima, incluso si la petición procede de un administrador; no reenvía sesión ni cookies. Estados vacío y error distintos, sin fallback. Máximo actual1000 addons; añadir paginación antes de superar esa cantidad.

GET /api/download?release=UUID consulta versión como visitante, comprueba ruta canónica/publicación y pide firma anónima60s a Storage; redirige303 solo al proyecto y bucket/path esperados. Retirada404,fallo503. Sin secretos, cuenta o pago. Verificado con fixture HTTP real y limpieza remota. URL emitida no se revoca por ocultar metadatos y puede vivir hasta su vencimiento.

Seis rutas prerenderizadas; contenido remoto cargado en navegador. Fichas CSR con rewrite Vercel preparado, no desplegado ni comprobado en Vercel. Pendientes SSR/SEO de fichas,404HTTP real y galería/instrucciones. Los apartados históricos inferiores que dicen catálogo local/Storage pendiente quedan sustituidos. Recuperación real sigue sin resolver y aplazada por el usuario; fase4 abierta.

## Decisiones de la fase 2

- Angular 22, componentes standalone, SCSS, comprobaciones estrictas y rutas con carga diferida.
- Inicio en `src/app/features/home/` y ruta no encontrada en `features/not-found/`.
- Layout en el componente raíz. Extraer componentes compartidos cuando haya reutilización real; no crear capas vacías.
- HTML del inicio prerenderizado durante la compilación, usando Angular SSR en modo de salida estática. No se ejecuta un servidor Angular permanente en producción.
- API Node.js en `api/`, independiente de Angular. El adaptador `server/dev.ts` solo sirve para desarrollo local.
- TypeScript de backend verificado con `tsconfig.api.json`; Node 24 ejecuta los tipos borrables en desarrollo y pruebas.
- Una sola instalación npm y un lockfile. Sin Express, ORM ni paquetes de Supabase o Stripe hasta que se implementen sus fases.

## Entradas y comandos

```text
src/main.ts                Aplicación del navegador
src/main.server.ts         Prerenderizado de Angular
src/app/app.routes.ts      Rutas públicas con carga diferida
api/health.ts              Función HTTP para Vercel
server/dev.ts              Adaptador HTTP local, puerto 3001
tests/api/health.test.ts   Prueba HTTP del handler real
vercel.json                Compilación y carpeta pública de salida
```

Abrir dos terminales en el proyecto:

```powershell
# Terminal 1
npm.cmd start

# Terminal 2
npm.cmd run start:api
```

- Web: `http://127.0.0.1:4200/`.
- API: `http://127.0.0.1:3001/api/health`.
- El proxy de Angular dirige `/api/**` al backend local. Si se cambia API_PORT, también hay que ajustar `proxy.conf.json`.
- Detener cada proceso con Ctrl+C.

La API de salud acepta GET y devuelve `{"status":"ok"}` sin detalles del entorno y sin caché. Otros métodos reciben 405. No comprueba la conexión a Supabase ni a Stripe.

## Comprobaciones

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd audit --omit=dev
```

`check` ejecuta tipos del backend, pruebas HTTP, pruebas de rutas Angular y compilación de producción. La salida estática queda en `dist/wow-forever-addons/browser/`.

## Vercel

La configuración preparada indica `npm ci`, `npm run build` y la carpeta de salida estática. `api/*.ts` contiene las funciones Node. No hay reescritura global de la web que capture accidentalmente rutas API. Se añadirán rutas y reglas cuando existan las páginas correspondientes.

No se ha creado ni vinculado un proyecto en Vercel. El funcionamiento de su runtime, cabeceras y rutas debe comprobarse en la fase de despliegue. La página desconocida de Angular cubre navegación cliente; las URLs desconocidas pedidas directamente a producción usarán por ahora el 404 de Vercel.

## Secretos

Supabase: ver SUPABASE.md. Cuatro migraciones aplicadas al proyecto remoto y probadas con PGlite. Verificación HTTP anónima real mediante npm.cmd run verify:supabase. Catálogo conserva datos locales; Auth administrativo real y MFA probados con el propietario. Storage HTTP pendiente.

Auth: ver ADMINISTRACION.md. SupabaseAdminGateway valida identidad con Auth y autorización mediante RPC admin_access sin parámetros, que consulta solo el sujeto actual. RLS exige pertenencia + aal2 en tablas y Storage. Login, MFA y logout reales comprobados. Recuperación PKCE implementada para origen local exacto; prueba privada de correo/cambio pendiente. Storage HTTP anónimo verificado, diagnóstico autenticado preparado pero pendiente de ejecución.

`.env` está excluido de Git. `.env.example` no contiene credenciales. /api/public-config entrega exclusivamente URL y publishable key mediante lista explícita; nunca el entorno completo ni claves secretas. Sin configuración válida, acceso deshabilitado. SDK Auth cargado de forma diferida, sin inicializar sesiones en prerender.

## Límites actuales

Inicio, catálogo local, ficha de Rumbo y apoyo comparten sistema visual. Supabase Auth real permite acceso administrativo con MFA; el área de gestión todavía es un marcador. No hay descarga, cobro, catálogo conectado, recuperación operativa ni panel de edición. Ver DISENO y ADMINISTRACION.

La compilación, pruebas e inicio de servidores locales se verificaron. La revisión visual inicialmente denegada se pudo realizar tras la solicitud posterior del usuario de obtener capturas. La fase 3 incluye revisión de las cuatro páginas en escritorio y móvil y del salto al contenido mediante teclado. La prueba del proxy API sigue pendiente. El servidor de vista previa se volvió a arrancar en la red local.

## Referencias

- https://angular.dev/guide/ssr
- https://angular.dev/reference/versions
- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/project-configuration

Retorno de aportaciones: POST /api/support-status verifica HMAC y caducidad antes de consultar RPC service_role read_support_test_status. Devuelve solo estado/importe/moneda; no depende del parámetro de éxito como prueba de pago.
