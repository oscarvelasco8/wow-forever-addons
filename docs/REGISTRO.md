# Registro de trabajo

## Sesión administrativa integrada por separado — en curso19/11

- Usuario insiste en que Acceso del equipo siempre pide login. Causa observada en main: footer dirigía a /administracion/acceso y login no intentaba restaurar sesión; almacenamiento seguía solo por pestaña. Arreglo existía en rama aplazada, aún no productivo.
- Se separa únicamente arreglo de sesión de3c1a098 a main, conservando permiso de recuperación Vercel7774aeb. No integrar catálogo ni asistente de publicación todavía. Footer ahora /administracion pasa por guard; login directo intenta restaurar getUser/admin_access. Sesión recordada hasta7d con caducidad absoluta, migración antigua de pestaña, logout limpia ambas copias y marcador impide resucitar sesión desde pestaña antigua. PKCE1h separado. No almacenar ni mostrar contraseñas/códigos.
- Validación Angular88 PASS y suite completa en curso. Se mantienen comprobaciones de pertenencia y MFA en backend; no modificar Supabase Auth remoto. Recuperación por correo sigue aplazada por usuario, sin nuevas solicitudes.
- Después de desplegar: usuario puede necesitar un primer login para crear sesión recordada; comprobar retorno desde catálogo y nueva pestaña sin volver a pedir contraseña. No afirmar prueba real hasta observarla. Captura sin credenciales tras revisión visual.


## Recuperación aplazada tras nuevo intento — 19/11

- Usuario solicitó enlace en navegador integrado, lo abrió primero en otro navegador y recibió falta de comprobación local. Después lo abrió en integrado y obtuvo enlace no validado/caducado/usado/anterior. No confirmó cambio de contraseña ni nuevo login.
- Usuario decide dejarlo pendiente. No solicitar más correos ni seguir probando ahora. Primera apertura puede haber consumido enlace, pero no se ha corroborado causa exacta; no afirmar que esperar o reiniciar límite de correo resolverá validación. Enlaces usados no se restablecen al esperar.
- Configuración de retorno Vercel y formulario habilitado sí comprobados; recuperación de extremo a extremo NO aprobada. Próximo cuando usuario retome: un enlace nuevo pedido y abierto exclusivamente en mismo navegador, sin apertura previa externa, y diagnóstico seguro de código de error si vuelve a fallar. Nunca registrar URL de enlace, verifier, contraseñas o códigos. Tres mejoras de usabilidad continúan en rama separada sin revisión visual final.


## Recuperación Vercel: configuración confirmada — 19/11

- Propietario guardó Auth URL Configuration. Comprobación visual de la página abierta Supabase: Site URL https://wow-forever-addons.vercel.app, Save changes deshabilitado, Redirect URLs contiene exactamente https://wow-forever-addons.vercel.app/administracion/restablecer. No comodines ni claves, lectura sin modificar ajustes.
- Se publica exclusivamente permiso de origen para recuperación y test regresión; rama de tres mejoras permanece independiente. No correo enviado por agente ni acceso a contraseña/códigos. Después del despliegue: comprobar formulario habilitado en web real y propietario solicita UN correo nuevo desde mismo navegador, completa MFA y cambio manualmente.
- Validación previa86 Angular, build,1 SSR,2 empaquetado PASS. No cambiar PKCE/MFA ni conceder permisos nuevos. No declarar recuperación aprobada hasta cambio y nuevo login confirmados.


## Recuperación en dominio alojado — en curso19/11

- Usuario vuelve a casa y deja revisión de las tres mejoras para más tarde. Rama codex/usabilidad-administracion sigue sin integrar, main continúa ba14d4a. Autoriza continuar recuperación y confirma tener correo/autenticador; no pedir contraseñas, enlaces o códigos.
- Causa comprobada: recoveryConfigured solo permitía origen LAN antiguo. Preparado permiso exacto adicional https://wow-forever-addons.vercel.app, conservando restricción contra previews arbitrarios. requestRecovery genera /administracion/restablecer en ese mismo origen.
- Trabajo aislado de main en codex/recuperacion-produccion, worktree LOCALAPPDATA/WoWForeverAddons/worktrees/recovery; node_modules junction local, sin copiar .env ni claves. Root sigue rama de usabilidad y notas locales preservadas. No mezclar las tres mejoras que usuario pospone.
- Nuevo test confirma retorno Vercel y deniega dominio preview. Angular86/86, build, SSR1/1 y empaquetado2/2 aprobados. No desplegado todavía. Se mantiene validación PKCE de recuperación, pertenencia y MFA antes de updateUser; no cambios SQL ni credenciales.
- Pendiente información solicitada por herramienta: Site URL y Redirect URLs de Authentication → URL Configuration de Supabase, solo direcciones públicas, para comprobar allowlist del retorno exacto. MCP disponible no expone ajuste Auth URL. No solicitar otro correo hasta verificar allowlist y desplegar corrección.
- Fuentes oficiales consultadas passwords y redirect-urls Supabase. Capturas finales deberán omitir enlaces/códigos y contraseñas; usuario realiza envío de correo, MFA y cambio de contraseña manualmente. No dar recuperación por comprobada hasta resultado real.


## Organización del panel — revisión visual19/11

- Propietario señala desorden en entrega anterior y exige comprobar interfaz en web abierta antes de entregar. Guardado explícitamente en AGENTS.md: no sustituir revisión visual por build/HTTP ni afirmar comprobación sin acceso.
- Reordenado panel: título/introducción y cierre de sesión en cabecera; Nuevo addon y categorías juntos debajo; listado con actualizar alineado, tarjetas de ancho completo y acciones juntas. Responsive apila grupos a950/650px. No cambia lógica ni datos.
- Build producción y preview compilados. Chrome observado visualmente muestra vista aislada loopback4201 con datos ficticios, no panel remoto conectado; captura fase7-panel-organizado-preview.jpg guardada, etiquetas de ejemplo visibles. Se verificó composición en escritorio; no afirmar sesión administrativa real ni móvil todavía.
- Propietario dice Chrome abierto. Única ventana controlable observada aún en vista previa local; comprobar panel remoto tras desplegar y, si requiere login, usuario debe autenticarse. No automatizar credenciales/MFA. Se sube corrección para poder revisar web alojada, no se considera entrega visual final hasta inspección.


## Nuevo addon en borrador — 19/11

- Propietario confirma login alojado correcto; aviso conexión pendiente no impidió acceso. Solicita creación de addons y autoriza implementarla ahora.
- Botón Nuevo addon en gestión y ruta protegida /administracion/addons/nuevo, anterior a :id; guard admin/MFA y salida con cambios. Formulario nombre/slug/categoría/autoría/resumen/licencia pendiente, sin publicación implícita. Tras crear abre editor existente para textos, imágenes y versiones.
- Inserción SDK con UUID fijo por intento, campos permitidos y status draft/distribution_approved false/published_at null forzados. Duplicado de dirección conserva formulario. Respuesta incierta consulta únicamente UUID; no repite inserción y bloquea nuevo envío si no puede confirmarla. Error de navegación conserva enlace al borrador creado.
- Inspección remota solo lectura confirma INSERT autenticado condicionado a private.is_admin(), que exige aal2 y pertenencia. No migración ni privilegios nuevos ni filas creadas por agente. Documentación SDK/changelog revisada. No prueba HTTP de creación con sesión del propietario todavía.
- Check completo20 API/24 SQL/85 Angular/1 SSR/2 empaquetado PASS. Nuevas pruebas: payload sin publicación, respuesta incierta sin duplicar, validación, no escritura al abrir y salida con cambios. Compilación visual separada aprobada tras corregir fixture.category; nunca acceso remoto desde fixture.
- Captura en preparación de vista aislada, datos de ejemplo. Capturas anteriores conservadas. Próximo: subir arreglo autorizado, comprobar ruta alojada y propietario crea su primer addon real como borrador. Recuperación de contraseña pendiente; Stripe desactivado. Sin Lua ni cambios SQL/Storage.


## Rutas 404 alojadas — 19/11

- Sustituida configuración Vercel de rewrites/headers por routes ordenadas: cabeceras globales/administrativas, SSR y CSR explícitos, filesystem para archivos y funciones existentes, cierre con404.html/status404/noindex/no-store. No convierte rutas válidas ni API existentes en404.
- Prueba de configuración cubre precedencia, accesos administrativos, SSR, archivos y rutas inexistentes; PASS. test:packaging2/2, check:release14/14 y diff --check aprobados. Se reutiliza build productivo vigente, sin cambios Angular/API/SQL/Storage/claves. Suite anterior20 API/24 SQL/80 Angular/1 SSR.
- Corrección autorizada se sube para despliegue automático y validación HTTP. No declarar404 alojado corregido hasta verificar. Fuente oficial routes: https://vercel.com/docs/build-output-api/configuration. Stripe continúa desactivado y recuperación de contraseña pendiente.


## Corrección del empaquetado ESM — 19/11

- Logs alojados aportados por propietario confirman ERR_MODULE_NOT_FOUND: api/catalog.js conservaba import a server/config/supabase.ts. Fallo de compilación/empaquetado, no credenciales. Config raíz usada por Vercel incorpora rewriteRelativeImportExtensions:true; conserva imports .ts para ejecución local y emite rutas .js al compilar. Referencia oficial: https://www.typescriptlang.org/tsconfig/rewriteRelativeImportExtensions.html.
- Nueva regresión tests/packaging/backend.test.mjs transpila api/server con opciones raíz, comprueba ausencia de imports relativos .ts y carga todos los handlers JS en proceso separado sin fuentes TypeScript, sin claves de entorno. PASS. Incluida en npm run check y por tanto CI; antes solo se probaban fuentes con Node y no este límite de compilación.
- Se subirá la corrección al repositorio para despliegue automático del proyecto Vercel ya autorizado; comprobar HTTP alojado después. No cambiar variables, Auth, SQL o Storage. Pendientes independientes: ruta inexistente200, recuperación de contraseña y prueba positiva de descarga/publicación real. Stripe permanece desactivado. No dar fallo alojado por resuelto hasta comprobar respuesta tras desplegar.


## Primer despliegue Vercel — revisión en curso19/11

- Propietario creó y desplegó proyecto con variables públicas Supabase y flags Stripe false. URL https://wow-forever-addons.vercel.app/ recibida del propietario. Ahora sí hay despliegue, pero no aceptación de funcionamiento integral.
- HTTP público: inicio/catalogo/apoyar200 noindex; acceso y recuperar200 con no-store/noindex; categorias200 CSR con cabeceras administrativas. Health200. Ficha Rumbo404 SSR coherente con borrador. Robots200. Ruta inexistente responde200 (pendiente corregir).
- Fallan500 en ejecución public-config/catalog/support-checkout/support-status/support-webhook/download/image/sitemap. No confundir con error de build ni con falta de dominio. No hay consultas POST, sesión administrativa o cambios remotos. API health funciona y render SSR responde; patrón apunta a carga de módulos, pendiente confirmar logs.
- Solicitado propietario mensaje de ejecución /api/catalog en Vercel Logs, sin secretos. No se hará despliegue especulativo ni cambio de claves. Añadido scripts/verify-hosted.mjs: solo GET sin cookies, imprime estado/expectativa, nunca configuración ni cuerpos. Expectativas actuales: Rumbo borrador404, Stripe desactivado, sitemap503 mientras no haya dominio canónico.
- Capturas del propietario muestran creación y éxito de build; no prueban el backend. Suite local anterior no detectó este fallo de empaquetado alojado. Recuperación de contraseña pendiente. Sin cambios SQL/Storage ni Lua. No se publica otro commit hasta concretar corrección.


## Publicación del código en GitHub — 19/11/2026

- Usuario autoriza continuar tras revisar importación Vercel de oscarvelasco8/wow-forever-addons, rama main, raíz ./ y preset Other. Cuenta Vercel creada por propietario; aún no se pulsa Deploy ni se configuran secretos alojados.
- Remoto y local parten de48c41e5 (solo README). Preparada primera versión completa de la web:308 archivos; .env, dependencias, builds y referencias excluidos. Comparación binaria de archivos del índice con valores privados locales: cero coincidencias, cero rutas prohibidas. No imprime valores. Capturas e informes existentes preservados; no contienen claves conocidas.
- npm run check aprobado20 API/24 SQL/80 Angular/1 SSR. Se corrigen dos líneas vacías finales detectadas por git diff --cached --check. Preparado commit y push normal a main, sin force, para que Vercel pueda compilar la versión autorizada. Este bloque sustituye restricciones históricas de no commit/push para esta entrega autorizada; no autoriza despliegue ni modo live.
- Siguiente: recargar importación Vercel tras verificar SHA remoto, revisar build/npm ci/dist y configurar únicamente variables necesarias con Stripe desactivado. Recuperación de contraseña pendiente. No addon Lua ni cambios remotos Supabase.


## Preparación de publicación — 19/11/2026

- Decisión del propietario: no construir flujo de solicitud de reembolsos. Conciliación de devoluciones/disputas fuera de esta fase. Aportaciones voluntarias, sin ventajas; no activar claves live. Se mantiene el alcance editorial de apoyo voluntario sin promesa fiscal.
- Revisados servidores locales:4200/3001 activos; auxiliar de captura4201 de sesión anterior sigue activo. No se cambió configuración remota ni la base de datos.
- Añadidos docs/PRODUCCION.md y npm run check:release: inspección del paquete público compilado, claves detectables sin imprimir valores, exclusión de fixtures/mapas, siete documentos, robots y empaquetado SSR. Catorce comprobaciones PASS. Prueba negativa controlada con clave sintética detectada, retirada en finally y nuevo PASS. No certifica ausencia absoluta de secretos ni Vercel.
- Guía incluye separación de ámbitos, dominio/build/runtime, secretos de backend, Auth/correo, recepción HTTPS de eventos sandbox, pruebas alojadas, observación y reversión sin deshacer migraciones. Fuentes oficiales Vercel environments/instant-rollback y Stripe webhooks consultadas el19/11. No se contrató ni eligió hosting.
- Validación: npm run check:release y node scripts/check-release.mjs --report PASS14; node --check scripts/visual/release-report.mjs y git diff --check correctos (solo aviso CRLF README). Suite productiva anterior conserva20 API/24 SQL/80 Angular/1 SSR; no se repite porque no cambia aplicación. Informe real local docs/capturas/fase9-paquete-informe.html, sin claves/datos personales. Captura pendiente de herramienta Windows; preservar anteriores. Captura anterior fase6-retorno-confirmado-preview.jpg es fixture, no prueba de sesión real.
- Pendientes para avanzar: elegir destino/dominio y validar un entorno alojado con Stripe desactivado; recuperación de contraseña pendiente antes de dar administración por operable. No se despliega ni se declara lista producción. Sin commit,push o Lua.



## Retorno confirmado y recuperación local — vigente 19/11

- Propietario confirma nueva prueba independiente de 3 €: «Aportación de prueba confirmada» e importe correcto. Backend remoto conserva tres pagos simulados (1.300 céntimos EUR); siete sesiones técnicas caducadas, diez sesiones/eventos. Sin dinero real ni despliegue.
- Retorno consulta exclusivamente el registro persistido por webhook. Recibo HMAC limitado a sesión e importe, caducidad de dos horas, guardado en sessionStorage; no va en URL. El identificador de retorno se limpia del historial. Son cinco consultas automáticas como máximo y reintento manual de consulta. Falta de prueba, error o demora nunca confirman pago ni generan otro Checkout. Formulario oculto durante el resultado; retorno no indexable.
- Aplicada selectivamente la decimotercera migración 20261119172251_support_receipt_status. RPC invoker accesible solo por service_role; devuelve estado, importe y moneda. Tipos remotos regenerados. Nueva SUPPORT_RECEIPT_SECRET aleatoria local ignorada, sin registrar su valor. Sin nuevas tablas ni privilegios del visitante.
- Recuperación real de evento sandbox: detenido únicamente listener propio; creada sesión técnica de 3 € sin pagar y caducada con API Stripe. Consulta devolvió pending mientras estaba desconectado. Listener reiniciado; recuperación manual de ventana 60 minutos: recorded=1, duplicate=9, failed=0. Segunda pasada: recorded=0, duplicate=10, failed=0. Consulta posterior expired. Pagos permanecen tres. No equivale a reintentos automáticos cloud de Stripe.
- npm run check PASS: 20 API, 24 SQL, 80 Angular, 1 SSR; siete rutas prerender. Typecheck posterior a regenerar tipos PASS. Primer intento técnico encontró reinicio del watcher (ECONNRESET), sin crear sesión; se repitió tras verificar puertos. Ruta de compilación visual corregida ejecutando desde scripts/visual.
- Herramientas operativas: npm run stripe:listen y npm run stripe:recover -- 60. Recuperación solo loopback, claves test, eventos propios; verifica firma antes de recuperar y no imprime payload/IDs/contactos. Mantener API y listener activos. Capturas de retorno se preparan como vistas con datos de ejemplo, separadas de la prueba real del propietario. Capturas anteriores conservadas.
- Siguiente: revisión integral de preparación para producción (conciliación de reembolsos/disputas, operación webhook alojado y configuración Vercel). Recuperación de contraseña sigue pendiente. No activar cobros reales ni declarar cerrada la fase 6. Sin commit, push o Lua.



## 19 de noviembre de 2026 — rechazo y autenticación 3DS sandbox aprobados

- Captura obtenida del informe propio mediante Chrome/Windows, URL HTTP loopback4201. Se evitó navegación file:// que había bloqueado control en sesión previa. Primera captura con Chrome oculto no correspondía visualmente al informe y no se guardó; se activó solo la ventana Chrome identificada, se corroboró informe y se guardó JPEG nativo fase6-stripe-rechazo-3ds-informe.jpg. Intento inicial de guardar como PNG fue rechazado antes de escribir; corregido usando MIME JPEG original. No se automatizó Codex, autenticación o gestión de claves. Servidor visual auxiliar detenido después,4200/3001/listener mantenidos. Solo informe de resultados, no Dashboard de Stripe.

- Línea base paid1/500 céntimos/eventos6. Checkout TEST y4200/3001/listener comprobados. Propietario usó tarjeta de rechazo genérico de Stripe testing; confirma rechazo visual. API Stripe test corroboró open/unpaid, requires_payment_method, card_declined/generic_decline. Lectura posterior Supabase conserva exactamente baseline. Solo lecturas de diagnóstico, sin recopilar contacto, tarjeta, IDs o URL en logs.
- Continuación del plan de dos pruebas: propietario abrió otro Checkout5€ y completó desafío con tarjeta ficticia 3DS requerida oficial. API Stripe: complete/paid, intent succeeded, three_d_secure.result authenticated, authentication_flow challenge, version2.1.0. Webhook recibido y persistido. SQL final paid2/total1000 céntimos EUR ficticios,expired5,sesiones7,eventos7. Reentrega manual del evento completado real con firma local devuelve200 duplicate; no representa reentrega automática de Stripe. No incrementa otra aportación.
- Sin dinero real ni nuevos cambios productivos. Última suite vigente17 API/24 SQL/77 Angular/1 SSR; git diff --check y sintaxis servidor visual comprobados. Añadido modo stripe-report para servir únicamente informe HTML con resultados verificados, sin credenciales o payload. Capturas se intentan tras guardar evidencia; no fabricar captura Dashboard. Pendientes retorno informado por backend, recuperación listener y criterios producción; no cierre total fase6. Sin commit,push,despliegue o Lua.

## 19 de noviembre de 2026 — rechazo real sandbox confirmado

- Checkout configurado TEST/servidores4200/3001 y listener verificados. Fuente Stripe testing oficial para tarjeta de rechazo genérico. Propietario confirmó rechazo visual; API Stripe test corroboró open/unpaid, requires_payment_method y card_declined/generic_decline, sin imprimir IDs, URL, claves o datos de tarjeta. Supabase mantiene línea base paid1/total500/eventos6. No código productivo cambiado ni nuevo pago creado por el agente.
- Preparada siguiente prueba de autenticación adicional del plan con tarjeta 3DS requerida de documentación oficial; usuario debe completar desafío de prueba. Verificación pendiente de respuesta, Charge three_d_secure y webhook. Sin dinero real; no se marca 3DS aprobado antes de comprobarlo.

## 19 de noviembre de 2026 — pago sandbox confirmado y preparación de rechazo

- Credencial Supabase corregida por propietario; cuota HTTP correcta, flags TEST activados y API reiniciada sin imprimir secretos. Listener Stripe conectado y firma local comprobada con evento ignorado200. Puertos4200/3001 activos. Prueba real detectó URLs Stripe g/pay no admitidas: corregido backend/frontend manteniendo host HTTPS/test e ID exacto; regresiones c/g y destinos ajenos comprobadas. Sesiones técnicas creadas durante diagnóstico caducadas sin pago; cinco eventos expired persistidos por webhook real.
- Propietario confirmó pago de5€ con tarjeta ficticia. SQL posterior: paid1/importe500/EUR, expired5, sesiones6/eventos6. Reentrega manual del evento Stripe real firmada localmente devuelve200 duplicate y conserva conteos; no representa reentrega automática de nube. Sin dinero real ni datos de tarjeta en la aplicación. El retorno todavía no consulta pago y muestra pendiente; backend confirmado. Informe HTML generado, intento de captura Windows interrumpido por verificación de URL, sin captura final ni automatizar Codex.
- Nueva fase rechazo autorizada: leídos memoria/registro/alcance y servidores; Stripe testing oficial confirma tarjeta de rechazo genérico. Baseline Supabase paid1/total500/eventos6. Usuario recibe instrucciones para rechazar en Checkout y mantener sesión abierta; pendiente de respuesta y comprobación Stripe PaymentIntent/ledger. No se ha dado la prueba por aprobada todavía.

## 19 de noviembre de 2026 — conexión del sandbox Stripe en curso

- Sandbox confirmado en captura aportada por propietario. .env ignorado confirmado, añadidos solo campos ausentes manteniendo enabled=false. Usuario introdujo clave Stripe por sí mismo; comprobación GET /v1/account satisfactoria sin mostrarla. Supabase backend sigue pendiente: valor guardado no tiene formato esperado y usuario no encuentra Secret keys. No se obtuvo ni imprimió ningún secreto con herramientas.
- Inspeccionados esquema ausente y asesor, aplicadas ledger20261119163932 y cuota20261119163933. INFO de RLS sin políticas resuelto con denegación explícita de clientes en migración20261119164042_support_client_denial; servicio backend BYPASSRLS conservado. Doce migraciones remotas/doce ficheros locales alineados, tipos regenerados; referencias de pruebas/scripts renombradas. service_role ledger+duplicate+budget probado con ROLLBACK. Asesor vuelve a solo aviso conocido de protección de contraseñas filtradas desactivada.
- Instalación portable Stripe CLI1.55.13 oficial: archivo windows_x86_64.zip, checksum SHA256 contrastado con publicación oficial. Primer filtro de assets no encontraba ZIP por patrón sin versión; corregido leyendo nombres oficiales, no se ejecutó antes de verificar. listen --help leído. Script stripe-listener.mjs usa clave en entorno mínimo, nunca argumentos, valida prefijo test, reenvía solo cuatro tipos Checkout propios al webhook loopback, guarda whsec en .env sin salida cruda. Listener sesión64298 conectado. No sesiones de pago creadas ni eventos de pago recibidos todavía.
- npm.cmd run check con migraciones/tipos actualizados PASS16 API,24 SQL,77 Angular,1 SSR. API no activada/reiniciada: preflight detectó credencial Supabase incorrecta y no cambió flags. Cuenta Stripe aceptada; credencial Supabase necesaria para persistencia/cuota se entrega exclusivamente al archivo local por propietario. Interrupción actual es ayuda de navegación, no fallo de Stripe ni aprobación pendiente. Sin despliegue, cobros, commit,push o Lua.

## 19 de noviembre de 2026 — aplicación selectiva de protección de archivos

- Continuación del mismo bloque tras QA: la migración de archivos no depende de Stripe. Inspeccionados columnas/políticas remotas, historial ocho versiones, objetos0 y asesor solo aviso conocido. Primera consulta múltiple mostraba solo último resultado; se repitió con agregación JSON para inspección efectiva. Aplicada únicamente draft_asset_revision mediante conector; versión asignada20261119144321, archivo local renombrado desde20261119142816. Nueve migraciones remotas/once archivos locales; webhook/cuota continúan pendientes, no aplicar en lote.
- Tipos TypeScript remotos regenerados, eliminada intersección temporal LocalDatabase. Primer check detectó null no aceptado en opcionales generados; corregido a omitir argumentos y usar default NULL SQL. npm.cmd run check final PASS16 API,24 SQL,77 Angular,1 SSR; siete prerender,320,81kB/89,00kB estimados.
- Prueba SQL remota transaccional con IDs generados y claims simulados: retirar ZIP sin perder versión, conservar retiro de ruta/rechazar reasociación, bloquear eliminación de imagen publicada y denegar aal1. Intento inicial con claims escalares fue rechazado por RLS antes de insertar; corregido request.jwt.claims JSON completo, prueba PASS y ROLLBACK íntegro. No se insertó storage.objects, no hubo blobs o borrados Storage reales. No equivale a sesión JWT/login HTTP real.
- Consulta posterior confirma funciones invoker, tres políticas Storage restrictivas, Rumbo draft/no aprobado1, otros addons0, objetos0, retiros0. Asesor sin avisos nuevos, conserva protección de contraseñas filtradas desactivada conocida. Documentación de estado actual corregida; menciones locales anteriores conservadas como historia. Capturas de componentes reales con fixtures siguen válidas y no prueban sesión remota. UI sin desplegar; pruebas HTTP administrativas/diagnóstico ampliado pendientes. Sin credenciales obtenidas, commit,push o Lua.

## 19 de noviembre de 2026 — reemplazo y eliminación de archivos en borrador

- Continuación del bloque recomendado sin Stripe. Leídos AGENTS/memoria/registro/alcance,4200/3001 activos. Revisados UI, servicios y políticas existentes; admin Storage permitía ALL, aunque UI no sobrescribía ZIP. Consultadas referencias oficiales Supabase/Storage y changelog; guía Supabase aplicada. Sin acciones destructivas remotas ni cambios de Rumbo.
- CLI3.2.0 migration new --help y migration new draft_asset_revision crean20261119142816_draft_asset_revision.sql SOLO local. Ocho migraciones remotas/once archivos locales, tres pendientes; no aplicar en lote. Registro privado de paths retirados con RLS, helper canónico para revisiones, RPC invoker con admin+aal2/CAS/motivo/bloqueos y triggers de protección. Storage restrictivo impide modificar asociados, borrar sin retiro o reutilizar retirados. Excepción probe diagnóstica estrictamente acotada y sin referencias.
- Reemplazo sube path revisionUUID sin upsert, confirma asociación y luego limpia original con Storage API; reconciliación previa a limpiar, preserva objetos ante respuesta incierta. Retirar ZIP deja versión y campos de archivo nulos; eliminar imagen quita fila. Limpieza pendiente distinta de guardado fallido, recuperable por draft_asset_status tras recarga. API pública admite revisiones propias con UUID/extensión validada y paths planos previos. Sin claves privilegiadas en frontend.
- UI revisión con motivo12–1000, casilla, foco, cancelar y guard; publicados bloqueados, formularios desactivados durante revisión/incertidumbre. Contrato ausente desactiva subidas antes de blobs. Contratos nuevos locales acotados, tipos remotos intactos. Diagnóstico publicación actualizado a limpiar sus fixtures: ocultar, devolver a borrador, borrar metadatos, Storage.remove; sin ejecutar con sesión real.
- Primeros tests detectaron mock randomUUID equivocado (assetId usa getRandomValues) y mock de import relativo no admitido por Angular. Corregido transport fixture capturando path realmente subido, sin simular import. SQL fixture requería summary/author_name, corregida. rg con comodín de ruta Windows y lectura inicial de verificador en carpeta auth fallaron; localizados con rg --files en core/supabase. Ningún fallo mutó remoto.
- npm.cmd run check PASS16 API,24 SQL contando contenedor,77 Angular,1 SSR compilada; siete prerender,320,81kB/89,01kB estimados. Pruebas SQL de reemplazo/ruta retirada/Storage protegido/CAS/auditoría, imagen eliminada y ZIP retirado sin borrar versión. Últimos escenarios SQL revalidados24. SDK real con HTTP controlado cubre orden de pasos, conflicto, pérdida de respuesta, limpieza y RPC ausente; componente revisión/confirmación/bloqueo. No son pruebas de blobs remotos o concurrencia multiproceso.
- Build preview assets PASS. CUA componentes reales con fixtures sin Supabase, revisión/cancelación ZIP y motivo sin casilla deja Confirmar desactivado. Foco vuelve al botón; sin overflow320(305=305)/390(375=375). Capturas fase7-archivos-reemplazo-preview-escritorio.jpg y fase7-archivos-eliminacion-preview-movil.jpg; no confirmación destructiva ni subidas reales. Anteriores conservadas, viewport restablecido y auxiliar4201 detenido.
- HTTP local final health200,catálogo200 vacío,Rumbo404. Documentado en ARCHIVOS.md, administración, arquitectura, Supabase, README y memoria. Pendiente revisión/aplicación selectiva, asesores/tipos y Storage HTTP con propietario, pruebas de red y diagnóstico actualizado. Fases4/7 abiertas; Stripe y recuperación aplazados. Sin nuevas dependencias, cobros, commit,push,despliegue o Lua.

## 19 de noviembre de 2026 — límites compartidos de Checkout

- Leídos AGENTS/memoria/registro/alcance, comprobados4200/3001. Guías Supabase/Postgres y referencias oficiales changelog, bloqueos PostgreSQL e idempotencia Stripe consultadas. Sin cuenta Stripe, claves obtenidas o cambios remotos.
- CLI3.2.0 migration new --help y migration new support_checkout_budget crean20261119132832_support_checkout_budget.sql SOLO local. Diez archivos locales/ocho migraciones remotas, dos pendientes. Tabla privada RLS y RPC invoker service_role sin acceso anon/authenticated, bloqueo global transaccional y ventanas de minuto/hora con máximos6/30; expurga contadores de más de24h al admitir. No guarda identidad/IP ni datos personales. No hay cuotas en memoria ni claves en frontend.
- Nueva admisión RPC previa a Stripe, después de validar solicitud.429 Retry-After al agotar,503 si protección falla, ninguno llama Stripe; reintento admitido consume cuota y conserva idempotencia Stripe. Disponibilidad requiere webhook configurado y credencial backend además de Checkout; GET no es health check de persistencia. Helper de configuración ledger compartido sin ciclo de imports. Sin valores reales añadidos al entorno.
- Support presenta cuenta atrás, desactiva importes/botón, impide reenvío durante espera y conserva UUID; al terminar permite reintento manual, sin automático, temporizador limpiado al destruir. Test con reloj controlado cubre antes/después y mismo UUID.
- npm.cmd run check PASS15 API,23 SQL contando contenedor,72 Angular,1 SSR; siete prerender. Pruebas SQL de minuto/hora/expiración/limpieza/permisos y API de decisión RPC, error,429, cabecera y ausencia de llamada Stripe. Tras último texto al acabar espera, Support3 tests y build+SSR revalidados. Bundle320,41kB/89,06kB estimados. Sin prueba de carga/concurrencia multiproceso o infraestructura remota.
- Build preview inicialmente invocado una vez desde cwd raíz con ruta relativa de scripts/visual, falló MODULE_NOT_FOUND; corregido workdir, build support PASS. Preview support-limit aislado loopback4201 devuelve429 sintético, CSP self sin conexiones externas. CUA espera decreciente/control desactivado, sin overflow320/390px; capturas fase6-limite-checkout-preview-{escritorio,movil}.jpg. Viewport restablecido y auxiliar detenido, anteriores intactas.
- HTTP habitual health200,Checkout200 enabled=false,webhook503 desactivado. Documentado carácter global, ventanas fijas y riesgo de agotar cuota para todos; WAF/red del alojamiento pendiente. No se aplica cuota al webhook para preservar reentregas. Runbook desactivación/señales y prerequisitos de activación en APORTACIONES.md. Sin commit,push,despliegue, cobros, nuevas dependencias o Lua. Fase6 abierta, siguiente sandbox/RPC/remoto cuando exista cuenta, recuperación aplazada.

## 19 de noviembre de 2026 — webhook y registro persistente local

- Usuario todavía no tiene Stripe; autorizado continuar localmente. Leídos AGENTS/memoria/registro/alcance,4200/3001 activos. Aplicada guía Supabase, consultados changelog, funciones y firmas Stripe oficiales. Sin claves obtenidas ni conexión remota en pruebas.
- CLI3.2.0 migration new --help y migration new support_webhook_ledger crean20261119130159_support_webhook_ledger.sql. NO aplicada remotamente; ocho migraciones remotas/nueve archivos locales. Tablas privadas RLS, grants backend necesarios sin DELETE, RPC invoker solo service_role/search_path vacío. Bloqueo de evento+sesión, atomicidad y rollback de conflictos, idempotencia y paid conserva confirmación ante orden alterado. Sin correo/tarjeta/payload íntegro ni acceso cliente.
- Webhook verifica Buffer original/SDK,±300s,256KiB, firmas acotadas, test e integración propia.400 inválidos/live,200 ignored ajenos,503 persistencia fallida,200 solo tras guardar/duplicado. Adaptador RPC destino fijo con secret backend dedicada aún vacía; no copia Authorization/cookies del visitante. bodyParser:false preparado sin prueba Vercel. Nuevas variables vacías/desactivadas en ejemplo; .env real intacto.
- Tests HTTP y SQL cubren cuerpo alterado, firma vieja/futura, tamaño, errores, privacidad, permisos, duplicados, conflictos/rollback y estado monotónico. verify:webhook:local PASS6 comprobaciones HTTP loopback→firma→RPC simulado→PostgreSQL PGlite en disco, cierre/reapertura y recuperación503→200. Temporales propios eliminados tras validar ruta. Informe HTML generado solo tras assertions aprobadas. Primer typecheck del script detectó genéricos de consulta faltantes; corregidos y check completo posterior PASS.
- npm.cmd run check PASS14 API,22 SQL contando contenedor,71 Angular,1 SSR compilada; siete prerender,320,41kB/88,92kB estimados. HTTP habitual health200,Checkout200 enabled=false,webhook POST503 desactivado. No son pruebas de cuenta Stripe, PostgREST remoto ni concurrencia multiproceso.
- CUA informe local servido loopback4201: seis resultados visibles,390px sin overflow, viewport restablecido. Capturas fase6-webhook-informe-{escritorio,movil}.jpg e informe HTML; no panel conectado o pago real. Auxiliar detenido,4200/3001 conservados, anteriores intactas. Documentación actualizada. Sin nuevas dependencias, cambios remotos, cobros, correos, commit,push,despliegue o Lua. Fase6 abierta: abuso/operación, credencial backend, migración remota revisada, sandbox y raw body Vercel pendientes; recuperación aplazada.

## 19 de noviembre de 2026 — preparación de Checkout de pruebas

- Servidores locales4200/3001 activos y health previo correcto. Leídos memoria/registro/alcance. Consultadas referencias oficiales Stripe. Pregunta asíncrona sobre disponibilidad de cuenta sin solicitar claves; pendiente de respuesta. Sin sesión Stripe ni claves obtenidas.
- Instalado stripe23.2.0 exacto; audit318 paquetes/0 vulnerabilidades, scripts existentes sin aprobaciones adicionales. Añadidos server/support-checkout.ts y api/support-checkout.ts, rutas en adaptadores dev/build. Solo test con activación explícita y origen fijo; importes3/5/10/20€, body1024B, UUID idempotente, sin retorno controlado por cliente, cuenta o ventajas. SDK API2026-11-18.endive fijada y serialización comprobada. Frontend desactivado inicialmente, carga disponibilidad solo navegador, selecciona importe/reintenta sin duplicar UUID y valida destino Stripe. Regreso/cancelación no afirman pago.
- Primer typecheck detectó parámetro renombrado por SDK actual: payment_method_types→allowed_payment_method_types, corregido sin casts para saltar contrato. Test de componente inicialmente observaba estado antes del callback afterNextRender; ajustado ciclo y estado inicial desactivado para HTML sin JavaScript. Pruebas posteriores aprobadas.
- npm.cmd run check PASS:12 API,21 SQL contando contenedor,71 Angular,1 SSR compilada; siete prerender,320,41kB/88,92kB estimados. API cubre transporte SDK, idempotencia, claves live, destinos/orígenes ajenos, importes inválidos, JSON y tamaño; Angular disponibilidad/reintento/navegación. HTTP real /api/support-checkout200 enabled=false sin secretos. No son pruebas reales de sandbox/pago.
- Preview `node ../../node_modules/@angular/cli/bin/ng.js build --configuration support` PASS; `node scripts/visual/serve.mjs support` aislado loopback con CSP self. Configuración ficticia test y POST503 sin Stripe. CUA selección10€ y fallo/reintento, sin overflow320(305=305)/390(375=375); capturas fase6-checkout-preview-{escritorio,movil}.jpg. Viewport restablecido y servidor auxiliar detenido. Anteriores conservadas.
- Documentado en APORTACIONES.md, arquitectura, memoria y README. Sin cambios remotos de datos/esquema, sin correos, cobros, commit,push,despliegue o Lua. Fase6 abierta: webhook persistente firmado/idempotente, controles de abuso y prueba sandbox integral pendientes; no activar públicamente. Recuperación aplazada.

## 19 de noviembre de 2026 — calidad, accesibilidad y SEO

- Cambiado a Angular híbrido outputMode server: /addons/:slug SSR, siete rutas prerenderizadas y panel CSR. PublicCatalog transfiere solo snapshot público a hidratación; inicializador server consulta con clave publishable/RLS anónima, nunca sesión de visitante. HTML inicial completo,404 si no existe/no visible y503 si falla proveedor. No consulta Supabase en prerender/build. Adaptador /api/render valida slug y no copia cabeceras/cookies; petición interna con host fijo permitido. Rewrite e includeFiles Vercel preparados, sin prueba en su infraestructura ni despliegue.
- PageSeo actualiza título, descripción, OpenGraph y canonical configurado. PUBLIC_SITE_URL obligatorio antes de indexar, en build y runtime; sin dominio confirmado no se inventa canonical y se marca noindex. Sitemap dinámico solo publicaciones/páginas públicas;503 ante falta de configuración/fallo, robots excluye admin/API y permite imagen pública. Build genera404.html desde prerender. Errores y gestión noindex, sin metadata privada o heredada.
- Accesibilidad: foco en main después de navegación, skip-link funcional, metadatos conservados en cambios de fragmento (caso cubierto), estados disabled y CSS de movimiento reducido. Inspección pública un h1/main, controles etiquetados y contraste de muestra texto15,29/secundario8,56/enlaces8,91 contra fondo. No es auditoría completa WCAG/lector de pantalla. Sin overflow320/390px ni errores de consola/hidratación en recorridos observados.
- Check final8 API,20 SQL contando contenedor,66 Angular,1 SSR del paquete compilado; siete prerender,319,44kB/88,70kB estimados. Tests SSR con upstream HTTP local controlado prueban positivo HTML/escapado/canonical,404 tras retirada y503; no es publicación real remota. SQL/RLS anteriores siguen pasando. Primera prueba detectó append no disponible en DOM de servidor; corregido a appendChild/removeChild y validado. Actualizado test de404 para localizar enlace de inicio explícito al añadir enlace al catálogo.
- Servidores4200/3001 comprobados activos; desarrollo reiniciado cargando .env para SSR. npm start conserva esa carga y nuevo start:built sirve bundle en loopback4202. HTTP real local: /addons/rumbo404 con HTML completo sin carga falsa, desconocida404, catálogo200 vacío; /addons/rumbo en dev4200 también404. Consulta final Rumbo draft/no aprobado=1,fixtures=0,objetos=0. Sin cambios de esquema/datos, siguen siete migraciones.
- Capturas reales del build local fase8-ficha-no-disponible-escritorio.jpg y fase8-error404-movil.jpg; no son vistas ficticias ni despliegue. CUA concluida, capturas anteriores conservadas. Documentación en docs/CALIDAD.md.
- Siguiente: rendimiento/optimización de imágenes y paginación antes de crecer. Siguen pendientes pruebas HTTP reales autenticadas del propietario, lector de pantalla/zoom completos, recuperación aplazada, dominio, validación de funciones Vercel, aportaciones y despliegue. No declarar fases4/7/8 cerradas. Sin commit,push o cambios Lua.
- Consultadas referencias oficiales Angular SSR/AngularNodeAppEngine y Vercel Functions. Sin dependencias nuevas ni claves secretas. git diff --check correcto.


## 19 de noviembre de 2026 — gestión de categorías

- Gestión /administracion/categorias enlazada desde panel: crear categoría oculta, editar nombre/identificador/orden y cambiar visibilidad. Revisión separada con motivo12–1000 y casilla explícita; advertencia de que ocultar categoría oculta hijos y mostrarla puede reactivar productos ya publicados. No cambia aprobación/estado individual ni elimina categorías. Guard de salida y foco después de render; conflicto/respuesta incierta conserva texto y bloquea guardar/editar hasta recargar.
- Séptima migración20261119100814_category_management aplicada, historial local alineado y tipos regenerados; no reaplicar. Añade categories.sort_order integer>=0 default0; RLS/grants de categorías conservados. RPC save_category SECURITY INVOKER comprueba admin+aal2, campos, creación solo oculta y updated_at con bloqueo de fila. Historial existente registra categorías mediante trigger privado; editorial_events.addon_id ahora nullable para estos eventos, índice por entidad/fecha. Tabla de eventos sigue solo lectura admin y escritura de aplicación revocada.
- Catálogo público incluye categorySlug/categoryOrder permitidos, filtro ordenado por orden/nombre/slug e identificado por slug (no agrupa categorías distintas de nombre igual). Categorías vacías no se muestran. Selectores administrativos respetan sort_order. Identificador único por restricción existente. Rewrites Vercel preparados, sin desplegar.
- Check aprobado:5 API,20 SQL contando contenedor,62 Angular,build seis rutas. Compilación final317,08kB/88,07kB estimados. Casos de creación oculta, campos inválidos/orden fraccionario, revisión/cancelación, concurrencia y conservación de formulario, duplicado, MFA/RLS, registro y ocultación de descendientes, orden/filtro por slug. Ultimo retoque visual deshabilita controles durante conflicto; build revalidado.
- Prueba remota transaccional con claims SQL: crear oculta, cambiar orden/visibilidad, rechazar timestamp obsoleto, registrar dos eventos sin parent addon y rechazar aal1; todo ROLLBACK. No equivale a login ni prueba HTTP real del panel. Asesor conserva solo aviso conocido de contraseñas filtradas desactivado; no cambia plan. Consulta final: Rumbo draft/no aprobado=1; fixtures=0; objetos=0; eventos de categorías=0; RPC anon denegado/invoker. Health200 y catálogo200 vacío.
- QA visual del componente real con fixtures locales, sin Supabase: listado, formulario, checkbox, revisión de visibilidad y cancelación; foco category-editor/category-review correcto. Sin overflow320px(305=305) y390px(375=375). Capturas fase7-categorias-preview-{escritorio,movil,confirmacion}.jpg; datos ficticios identificados, imágenes anteriores conservadas. Harness aislado scripts/visual con configuración categories, sin ruta demo en producción. CUA concluida.
- Siguiente: calidad/accesibilidad/errores/SEO de fichas. Siguen pendientes revisión HTTP con sesión real de categorías/editorial/galería y recuperación aplazada, eliminación/reemplazo de archivos, paginación antes de crecer, aportaciones y despliegue. Fases4/7 no se declaran cerradas. No se modificó ni publicó Rumbo. Sin commit,push,despliegue web o cambios Lua.
- Guías Supabase/Postgres aplicadas; esquema remoto inspeccionado, documentación oficial consultada. CLI3.2.0 migration new tras --help; SQL real probado en PGlite antes de aplicar con conector, archivo renombrado al historial del servidor y tipos regenerados. Sin dependencias nuevas.


## 19 de noviembre de 2026 — galería pública y capturas

- Galería pública integrada en la ficha: imagen principal, miniaturas ordenadas por sort_order/id, contador, anterior/siguiente sin salir y navegación por botones nativos con teclado. Texto alternativo y pie de imagen; estados carga/error con reintento. Si no hay imágenes publicadas se conserva la ilustración conceptual identificada, sin inventar capturas de Rumbo.
- /api/catalog incorpora solo id y altText de addon_images publicadas; consulta anónima, filtros explícitos y serialización permitida, sin rutas Storage ni notas privadas. Nuevo GET /api/image?image=UUID comprueba imagen, padre aprobado/publicado/fecha y categoría visible, valida ruta canónica PNG/JPG/WebP y firma anónimamente conTTL60s. Redirect303/no-store/no-referrer;404 para oculto/inexistente,503 para proveedor y405 otros métodos. No reenvía cookies/JWT ni usa service_role. Storage revalida RLS al firmar. Los enlaces emitidos pueden durar60s y los bytes ya cargados no se revocan del navegador.
- Sin migraciones, permisos nuevos, dependencias ni cambios de datos remotos; siguen seis migraciones. Consulta final: Rumbo draft/no aprobado=1, fixtures=0 y objetos=0. Health200, catálogo real200 vacío, imagen inexistente404. Positivo del endpoint probado por HTTP con upstream simulado; imagen real publicada y retirada con Supabase sigue pendiente de sesión del propietario. Diagnóstico existente ampliado con bytes de imagen desde /api/image y404 al ocultar padre/categoría; aún no ejecutado. Su mensaje de limpieza distingue filas de catálogo del historial retenido.
- Check final aprobado:5 API,19 SQL contando contenedor,56 Angular y build seis rutas,316,70kB/88,10kB estimados. Cubre imágenes ocultas/padre borrador/sin aprobación/fecha futura/categoría oculta/ruta inválida/SVG rechazado, firma denegada/fallo/destino externo, separación de sesión, DTO y selección/reintento/eventos tardíos/miniaturas fallidas. Se excluyó scripts/visual del tsconfig backend: el harness Angular tiene tsconfig propio y no debe pasar por NodeNext.
- QA CUA del componente real con fixture local: tres ilustraciones SVG originales (solo preview), carga y selección por ratón/Enter, contador, error404/reintento y vuelta a imagen válida. Sin overflow320px (305=305) y390px (375=375). Capturas fase5-galeria-preview-{escritorio,movil,error}.jpg en docs/capturas. Son ejemplos identificados sin conexión Supabase; ninguna captura real del addon. Preview separado scripts/visual, CSP sin conexiones externas, sin ruta demo en producto. CUA concluida. Capturas anteriores conservadas.
- Siguiente: gestión de categorías (crear, ordenar, visibilidad) y después calidad/accesibilidad/SEO. Pendientes prueba HTTP real del flujo editorial/galería, recuperación aplazada, eliminación/reemplazo de archivos reales y optimización de imágenes antes de producción. Miniaturas usan archivo original con carga diferida, sin derivados ni transformación de pago. Sin commit,push,despliegue o cambios Lua.
- Consultados changelog y documentación oficial Storage; guías Supabase aplicadas. Primera comprobación detectó tipos unknown de la firma y la inclusión accidental del harness visual en tsconfig.api; corregidos antes del check completo aprobado.


## 19 de noviembre de 2026 — capturas para revisión fuera de casa

- El usuario está fuera de casa y pide capturas al acabar cada tarea, incluida esta. Preferencia incorporada a AGENTS y memoria; no depender de revisión inmediata en su ordenador.
- Preparada vista previa aislada en scripts/visual: workspace Angular propio, componentes App/Editorial reales y gateway de solo lectura con datos ficticios, sin credenciales ni conexión Supabase. Servidor auxiliar loopback4201, CSP connect-src none, no forma parte del build principal ni añade rutas de demostración al producto. Compilación de estilos críticos desactivada solo en preview para que CSP no bloquee su carga.
- Capturas nuevas en docs/capturas: fase7-editorial-preview-completa.jpg (panel, imagen propia de ejemplo e historial expandido), fase7-editorial-preview-ficha.jpg (estado publicado ficticio y retirada), fase7-editorial-preview-confirmacion.jpg y fase7-editorial-preview-confirmacion-movil.jpg. Todas son vistas de ejemplo, no evidencia de login/publicación real. Capturas previas conservadas. Entregar imágenes embebidas en la respuesta.
- QA visual: sin overflow a320px (305=305) y390px (375=375). Detectado foco de revisión programado demasiado pronto; cambiado queueMicrotask por afterNextRender con Injector. Navegador confirma activeElement editorial-review. npm.cmd test pasa53; build principal seis rutas,316,51kB/88,00kB estimados. Build independiente del preview aprobado. Sin cambios de esquema o datos remotos en esta sesión.
- Revisión visual de ejemplo completada; sigue pendiente la sesión HTTP real y operaciones del panel con el propietario. Recuperación permanece aplazada; Rumbo no se modifica ni publica. Sin commit,push o despliegue.


## 19 de noviembre de 2026 — revisión editorial y auditoría

- Ruta protegida /administracion/addons/:id/publicacion: revisión de distribución separada, publicar/retirar ficha y versiones, devolver versiones retiradas a borrador, editar texto alternativo/orden y publicar/ocultar imágenes. Cada acción muestra una revisión, exige motivo de 12–1000 caracteres y casilla explícita; no hay publicación automática. Listado administrativo incluye todos los estados. Subidas admiten nuevas versiones draft bajo padre publicado, sin sobrescribir ZIP.
- Sexta migración remota 20261119074101_editorial_workflow (archivo local alineado al historial; no reaplicar). RPC SECURITY INVOKER con pertenencia+aal2, bloqueos de padre/hijo y timestamp esperado. Publicar ficha exige aprobación, categoría visible y versión preparada; publicar versión exige blob registrado, checksum/tamaño y máximo50MiB. SQL no analiza el ZIP: se apoya en validación de subida. La aprobación documenta la revisión humana, no acredita derechos automáticamente.
- Retirar versión archiva y conserva ZIP; volver a borrador es separado de publicar. Retirar addon devuelve padre a draft, revoca aprobación, archiva versiones publicadas y oculta imágenes en la misma transacción. No reaparecen automáticamente al republicar. Firmas anteriores pueden vivir hasta60s.
- Historial editorial_events: triggers para altas/ediciones/bajas de addons/versiones/imágenes desde su activación (sin reconstrucción histórica). Identidad Auth, entidad, fecha, operación, campos cambiados y metadatos antes/después; no duplica descripción/créditos/instrucciones/changelog completos. Nota suministrada por operación. Tabla RLS solo lectura para admin+aal2; sin INSERT/UPDATE/DELETE para roles de aplicación. Trigger SECURITY DEFINER en esquema privado, search_path vacío y ejecución directa revocada; único propósito añadir eventos. Mantenimiento privilegiado sigue pudiendo administrar la base; no es auditoría externa inviolable.
- Validación: check con4 API,19 SQL contando contenedor,53 Angular y build seis rutas. Check final aprobado:316,51kB/87,97kB estimados, seis rutas prerenderizadas. Prueba remota transaccional con contexto de claims SQL comprueba aprobación, edición de imagen, auditoría, rechazo sin MFA y sin archivo; todo ROLLBACK. No equivale a sesión HTTP real. Tipos regenerados desde remoto. Asesor de seguridad solo aviso conocido de protección de contraseñas filtradas desactivada; sin cambios de plan.
- Servidores inicialmente parados; levantados en segundo plano (4200 en red local,3001 loopback). Health200 y catálogo200 vacío. Rumbo sigue sin tocar ni publicar. IAB vuelve a estar disponible; pestaña2 nueva exige login. Solicitado al usuario completar acceso y abrir Revisión y publicación para QA visual/HTTP. Esta revisión sigue pendiente; no hay captura nueva de la pantalla editorial todavía.
- Consulta remota final: cero fixtures, cero objetos y cero eventos residuales (prueba revertida); Rumbo sigue draft/no aprobado. Journal con RLS, SELECT authenticated y sin escritura de aplicación ni lectura anónima; RPC invoker confirmado. git diff --check correcto.
- Pendientes: QA visual/HTTP del flujo nuevo, galería pública, gestión de categorías y eliminación/reemplazo de archivos reales; recuperación aplazada sin resolver y fase4 abierta. Sin commit,push,despliegue web o cambios Lua.
- Guías Supabase/Postgres aplicadas; consultados changelog y documentación oficial de funciones/Storage. CLI3.2.0 migration new tras --help, PGlite aprobado antes de aplicar con conector. Tipos regenerados; archivo renombrado a versión asignada por servidor. Tests SDK/RPC de payload, conflictos y errores; UI de confirmación/cancelación/imagen/guard de salida y respuesta incierta; SQL cubre permisos, categoría oculta, blob ausente, publicación y retirada sin resurrección. No se han creado blobs remotos en esta sesión.


## 19 de noviembre de 2026 — limpieza de subidas verificada

- Limpieza autorizada y completada el 19 de noviembre: ZIP ya ausente al retomar; marcador de carpeta y PNG eliminados mediante Storage en Chrome nativo con sesión existente (IAB no disponible). No se borró storage.objects por SQL. Después se eliminaron las filas temporales por UUID y estado. Consulta remota final: cero archivos, addons, versiones e imágenes del fixture; Rumbo conserva su borrador sin aprobación y su única versión original. Captura fase7-subidas-limpieza-final.png; capturas anteriores conservadas. CUA concluida.
- Memoria y administración actualizadas; este resultado sustituye la limpieza pendiente del bloque anterior. Sin cambios de código ni repetición de tests: último check aprobado 4 API,18 SQL,47 Angular. git diff --check correcto. Python no disponible; documentación actualizada con Node. Recuperación aplazada; sin correos, commit, push ni despliegue.


## 19 de noviembre de 2026 — creación de versiones y subidas privadas

- Usuario autoriza continuar con imágenes/ZIP. Leídas instrucciones/continuidad/alcance y servicio/editor existentes; servidores locales activos. Consultadas fuentes oficiales Supabase upload, fflate y noble-hashes, y versiones en npm.
- Instaladas versiones exactas fflate0.8.3 y @noble/hashes2.4.0; auditoría de instalación cero vulnerabilidades. Dependencias diferidas, no secretos. Npm avisó de scripts de herramientas de desarrollo ya presentes sin allowlist; no se aprobaron scripts adicionales. No se alteraron migraciones, RLS, grants, buckets o plan.
- Nueva ruta administrativa de archivos bajo guard/MFA/cambios pendientes y rewrite Vercel preparado. Creación de versiones draft, ZIP de hasta50MiB sin sobrescritura, imágenes PNG/JPEG/WebP hasta5MiB con alt/orden y vista previa blob privada. Todo permanece sin publicar.
- ZIP: índice sin extracción/ejecución, .toc bajo carpeta, rutas seguras/duplicados/métodos/10000 entradas/250MiB expandidos declarados; SHA256 de bytes. Imagen: firma/extensión y decodificación, 8192px/lado y32MP. No equivale a antivirus, auditoría completa de ZIP ni prueba en juego.
- Flujo compensatorio Storage/metadatos: reconcilia resultados inciertos, protege objetos referenciados, elimina solo objetos nuevos no asociados y verifica limpieza mediante RPC admin/listado; informa ruta si requiere revisión. ZIP ya asociado no reemplazable, nuevo paquete requiere versión nueva.
- Check final: 4 API,18 SQL contando contenedor,47 Angular,build seis rutas;303,44kB/84,22kB estimados. Pruebas de formatos falsos/traversal/límites, compensación/respuesta perdida/limpieza fallida, no sobrescritura, MFA y formularios. Un test inicialmente agotó5s por reintento503 del SDK; se cambió al escenario401 de sesión no válida y toda la suite pasa.
- Creado fixture privado propio y ficheros de prueba en TEMP/wow-forever-upload-check. UI real IAB2 creó versión, rechazó ZIP falso y PNG falso, subió ZIP378B/PNG132B y mostró vista previa. SQL confirma checksum igual al calculado por Node, draft y distribución no aprobada. Catálogo público sigue200 vacío; Rumbo intacto. Capturas fase7-subidas-verificadas-{escritorio,movil}.jpg;320px sin overflow, noindex.
- Limpieza de dos blobs y filas temporales pendiente de confirmación explícita solicitada al usuario: Storage advierte borrado irreversible y política CUA exige confirmación en el punto de acción. IAB8 diálogo Delete ZIP abierto. IDs/rutas exactos en MEMORIA. No se ejecutó borrado ni se afirma limpieza concluida; no borrar metadatos storage.objects por SQL.
- Recuperación permanece aplazada y sin resolver. Panel de archivos parcial: sin eliminación/reemplazo de contenido real ni publicación/galería pública. Sin commit,push,despliegue ni cambios Lua.

## 19 de noviembre de 2026 — edición de borradores del panel

- Continuación autorizada por el usuario desde la propuesta de empezar por borradores. Leídos AGENTS, memoria, registro, alcance, tipos, políticas y componentes; servidores locales conservados. Guías Supabase y Postgres aplicadas; consultados changelog y documentación oficial update.
- Inspeccionado esquema remoto antes de modificarlo. Creada migración con npx supabase@3.2.0 migration new tras leer --help. Campo installation_instructions text, NOT NULL/default vacío y CHECK de 30000 caracteres. npm run test:db pasó antes de aplicar. Conector aplicó versión 20261118225704; archivo local renombrado a esa versión y tipos actualizados según salida regenerada. Sin cambiar RLS ni grants.
- Implementados admin-drafts.ts y operaciones del gateway con getUser/admin_access antes de cada consulta/escritura. Lista de borradores, editor privado, categoría/autoría/licencia/créditos/instrucciones y edición de compatibilidad/changelog de versiones draft existentes. Guardado separado, explícito, sin aprobación ni publicación. Datos remotos de instalación incorporados a catálogo/ficha pública.
- Control de concurrencia con updated_at y status draft en UPDATE; lista permitida de campos. Conflicto si cero filas, sin perder texto. Prevención de salida/recarga con cambios sin guardar. Vista previa privada de los campos. Noindex/nofollow en panel/editor y limpieza al salir; rewrite Vercel preparado. Herramientas de comprobación conservadas en details.
- npm.cmd run check final pasó: 4 API, 18 SQL contando contenedor, 37 Angular y build seis rutas. Inicial 302,61 kB /83,95 kB estimados. Tests nuevos usan SDK real con transporte simulado para filtros/payload/concurrencia y formularios para errores/estado limpio/noindex. SQL comprueba límite de instrucciones y RLS heredada. git diff --check correcto.
- Creado fixture privado con UUID real y versión temporal mediante conector. CUA en sesión administrativa existente: guardada ficha/nombre/descripción/instrucciones y versión/cliente/interfaz/changelog; consulta remota verificó persistencia y draft/no aprobado. Producido cambio concurrente del fixture desde SQL: UI rechazó guardar, conservó texto pendiente y recargó tras confirmación; consulta verificó que el cambio externo no se sobreescribió.
- Eliminados fixture y versión temporal por UUID y estado, sin tocar Rumbo. Verificación posterior: cero fixtures, una versión original, Rumbo borrador/no aprobado/instrucciones vacías. /api/catalog HTTP200 vacío. Sin publicación ni correos de recuperación.
- Panel y editor revisados en escritorio/320px sin overflow. Capturas fase7-gestion-{escritorio,movil}, fase7-editor-{escritorio,movil}, fase7-editor-guardado-real y fase7-editor-conflicto, todas .jpg. IAB2 entregable en editor Rumbo sin cambios; CUA concluida.
- Asesor conserva aviso conocido de protección de contraseñas filtradas desactivada; no se cambió plan. Panel parcial: creación/subidas/imágenes/ZIP/publicación y auditoría siguen pendientes. Recuperación sin resolver/aplazada y fase4 abierta. Sin commit, push, despliegue o cambios Lua.

## 18 de noviembre de 2026 — catálogo público y descargas conectados

- Usuario comunica que recuperación sigue fallando y pide continuar dejándola pendiente. No se envían correos ni se afirma fase4 cerrada. Leídas instrucciones/continuidad/alcance, arquitectura y componentes existentes; servidores activos.
- Consultadas referencias oficiales Supabase select/Storage/RLS y Angular afterNextRender. Sin dependencias, migraciones, claves secretas o cambios al addon.
- Añadidos server/catalog.ts, API GET /api/catalog y /api/download con adaptador local. API catálogo siempre anónima, no forward Authorization/cookies, DTO permitido, validación publicación/fecha/categoría/aprobación y errores genéricos; no-store. Límite actual1000 productos sin paginación.
- Download valida UUID/estado/fecha/ruta canónica, consulta metadatos y firma como visitante con TTL60s, destino exacto validado y303;404 para retirada/inexistente,503 para fallo,405 otros métodos. Errores HTML con vuelta al catálogo. No necesita cuenta/pago, no service_role. Firmas emitidas pueden seguir válidas hasta caducar.
- Reemplazados datos estáticos ADDONS/RUMBO por PublicCatalog compartido tras primer render. Inicio/destacado/preview/listado/ficha dinámicos y categorías derivadas del catálogo; sin fallback ficticio. Estados carga/vacío/error/reintento, búsqueda normalizada y ficha no disponible para borradores. Eliminado core/catalog/addon.ts. Texto remoto seguro por interpolación.
- Rutas /addons/:slug CSR, rewrite Vercel preparado y seis rutas prerenderizadas. Sin Supabase en build; SSR/SEO de fichas y estadoHTTP404 de URL pública pendientes de producción. Galería/instrucciones editoriales no implementadas aún.
- Durante validación corregido envío prematuro de cabecera200 antes de esperar la consulta; pruebas de fallo cubren503. Ajustados tests antiguos del catálogo estático. Test HTTP con upstream simulado prueba separación de sesión, DTO, fallos, rutas de descarga y bloqueo de redirección externa. check final correcto:4 API,17 SQL contando contenedor,30 Angular; seis rutas,301,58kB/~83,80kB estimados. Se detuvieron dos ejecuciones de test colgadas de la versión anterior; la versión corregida pasa.
- Verificación local contra proyecto real: /api/catalog200 vacío, download UUID inexistente404. Diagnóstico ampliado ejecutado mediante CUA en sesión admin real existente IAB2: once resultados correctos, incluidos catálogo publicado y ZIP idéntico por API propia, y404 tras retirada. Sin leer tokens ni introducir credenciales.
- SQL posterior confirma0 fixtures y0 objetos en buckets, Rumbo borrador/no aprobado. No se publicó addon real. Navegador muestra catálogo vacío/ficha borrador no disponible y home0 publicados. Sin overflow320px en esas tres vistas; capturas fase5-{catalogo,inicio,ficha-borrador}-{escritorio,movil}.jpg y fase5-api-publicacion-verificada.jpg. IAB2/IAB7 entregables, CUA concluida.
- README,memoria,arquitectura,Supabase/diseño/administración actualizados. Recuperación,caducidad de sesión y usuario normalHTTP pendientes; fase4 abierta. Sin commit,push,despliegue ni cambios Lua.

## 18 de noviembre de 2026 — publicación y retirada HTTP aprobadas

- Usuario confirma login resuelto por corrección de la contraseña introducida; no fue necesario modificar cuenta, permisos o autenticador.
- Propietario ejecutó botón Probar publicación y retirada y entregó nueve resultados correctos. Verificados por recorrido HTTP real: borradores/hijos bajo padre borrador ocultos, publicación con descarga anónima idéntica sin pago/cuenta, escritura anónima/reemplazo ZIP denegados, retirada ZIP conservando imagen, nuevas firmas denegadas y caducidad de enlace previo, padre borrador y categoría oculta bloquean hijos y limpieza API completa.
- Consulta remota de solo lectura: categorías/addons verification-% = 0; storage.objects de ambos buckets = 0; addon_images = 0; addon_releases = 1 original; Rumbo borrador sin distribución aprobada = 1. Fixtures eliminados, addon real intacto.
- Memoria, ADMINISTRACION y SUPABASE actualizados. Sin cambios de código ni repetición de tests; último check aprobado se conserva. Recuperación sigue aplazada y sin verificación real; caducidad/renovación de sesión y usuario autenticado sin pertenencia por HTTP pendientes. Fase 4 abierta, sin commit/push/despliegue.

## 18 de noviembre de 2026 — acceso rechazado antes de probar publicación

- Usuario informa que no puede iniciar sesión y confirma utilizar la contraseña que funcionó para Storage. No se cambia ninguna credencial ni se elimina MFA.
- Health directo127.0.0.1:3001 y proxy192.168.1.137:4200 devuelven200. Logs agregados Auth:3 invalid_credentials400,último22:34:27UTC; último over_email_send_rate_limit429 observado21:53:10UTC. No leídos payloads privados/contraseñas/tokens.
- Consulta agregada confirma1 cuenta admin,1 confirmada,0 bloqueadas y1 con TOTP verificado. Consulta agregada de acciones audit_log_entries3h vacía; no prueba ausencia de cambio de contraseña.
- Diagnóstico: credenciales rechazadas por servidor antes de MFA, causa concreta pendiente; no guard ni prueba de bloqueo de cuenta. Solicitado un solo intento manual sin autofill; si falla, recuperación privada tras espera. Recordar que otro bloqueo22:53Madrid puede mantener cooldown hasta23:53, sin garantizar hora de liberación del servicio.
- Prueba publicación/retirada aún SIN ejecutar. Sin cambios de código ni nuevas pruebas innecesarias; memoria actualizada. Sin despliegue ni cambios al addon.

## 18 de noviembre de 2026 — prueba de publicación y retirada preparada

- Usuario acepta dejar recuperación pendiente por cuota de correo y continuar. Leídos AGENTS, memoria, registro, alcance, migración de catálogo y diagnósticos existentes. Servidores locales4200/3001 comprobados activos.
- Consultada documentación oficial Storage sobre downloads/RLS y limitación de revocación de URLs firmadas. Sin cambios de políticas, migraciones, dependencias o plan.
- Añadido diagnóstico autenticado diferido verify-publication.ts y botón explícito en administración. Fixtures propios: categoría/producto/version/imagen, UUID nuevos, ZIP vacío22 bytes y PNG1px; sha256 calculado con node:crypto. Etiquetas de prueba inequívocas y rutas canónicas. Nunca modifica Rumbo.
- Comprueba borrador/hijos publicados bajo padre borrador, publicación y bytes anónimos, rechazo de modificación/reemplazo anónimos, firma publicada, retirada/nuevas firmas, caducidad URL previa, ocultar padre/categoría. Cliente anónimo con fetch cache:no-store. No asume revocación inmediata de URLs ya emitidas.
- finally oculta fixtures y ejecuta toda limpieza; elimina objetos, hijos, padre y categoría y comprueba cero filas/archivos. Informa UUID de fixture si limpieza incompleta. No se ha ejecutado todavía contra HTTP real; solicitado al propietario botón desde su sesión ya iniciada.
- npm.cmd run check correcto:3 API,17 SQL contando contenedor,28 Angular,build siete rutas;301,28kB iniciales/83,70kB estimados. No se afirma diagnóstico real aprobado. Sin commit,push,despliegue ni cambios Lua.

## 18 de noviembre de 2026 — Storage HTTP autenticado verificado

- Propietario ejecuta diagnóstico desde área de gestión con sesión real y MFA, y entrega doce resultados correctos. Se comprueba así también reingreso con factor ya vinculado.
- addon-files y addon-images: upload, upsert, descarga idéntica, borrador real denegado a anónimo/URL pública, firma administrativa accesible y caducidad HTTP, rechazo MIME inválido, exceso de 50 MiB y 5 MiB respectivamente, eliminación y listado final vacío.
- Consulta remota de solo lectura sobre storage.buckets LEFT JOIN storage.objects: ambos public=false y cero objetos _verification/ restantes. file_size_limit conserva 104857600 ZIP y 5242880 imágenes; prueba HTTP confirma que el global limita ZIP a menos de la configuración del bucket.
- No se crearon publicaciones ni se tocaron archivos del addon. Sin cambios de código ni repetición innecesaria de tests; último check sigue aprobado. Memoria, ADMINISTRACION y SUPABASE actualizados.
- Pendientes recuperación real tras cuota de correo, caducidad de sesión y matriz HTTP de publicación/retirada/usuario normal. Fase 4 sigue abierta. Sin commit, push ni despliegue.

## 18 de noviembre de 2026 — corrección tras fallo real de recuperación

- Usuario confirma que callback local ya carga pero rechaza enlace; reenvíos fallan. No se considera recuperación comprobada ni contraseña cambiada.
- Consultados logs Auth solo con agregados, sin mensajes/URLs/tokens/correos. Confirmados 4 over_email_send_rate_limit HTTP429; última 21:26:11 UTC. Documentación oficial: proveedor integrado 2 correos/hora, límite compartido. Aconsejado esperar hasta23:30 Madrid antes de un intento nuevo. No se emitieron más correos con herramientas ni se alteraron límites.
- Revisado SDK2.119.1: crea y guarda verificador ANTES de /recover; un fallo puede reemplazar el de un correo ya entregado. Nuevo preservePkceOnFailure restaura estado previo si error. createAuthStorage comparte exclusivamente PKCE entre pestañas, vencimiento1h; conserva tokens/sesión en sessionStorage. No migradas ni exportadas credenciales antiguas.
- Mensajes específicos de límite429 y de comprobación local ausente. Tras detectar429, guarda solo hora de reintento y bloquea reenvío1h. Instrucción corregida a mismo navegador/dispositivo; ya admite pestaña nueva. No se habilita sesión por parámetros de URL ni se elimina MFA.
- Pruebas significativas: SDK REAL con fetch simulado valida solicitud en pestañaA e intercambio enB/evento PASSWORD_RECOVERY, sesiones aisladas; vencimiento PKCE, rollback429, no duplicar envío y mensaje UI sin falso éxito. No prueba correo remoto.
- npm.cmd run check: 3 API,17 SQL contando contenedor,28 Angular,build siete rutas;300,73kB iniciales/83,72kB estimados. Servidores4200/3001 siguen activos; git diff --check sin incidencias antes de documentación.
- Captura fase4-recuperacion-corregida-pestanas.jpg. IAB2 entregable; handoff anterior concluido fallido, resumen CUA enviado. Nuevos pasos privados pendientes tras cuota. Solicitado login habitual y botón Storage si recuerda contraseña; resultado pendiente. Sin commit,push,despliegue ni cambios Lua.

## 18 de noviembre de 2026 — recuperación y Storage HTTP parcial

- Leídas instrucciones y continuidad. Comprobados listeners 4200/3001 y HTTP 200 de health directo/proxy y recuperar; conservados procesos.
- Consultados skill Supabase, changelog y documentación oficial PKCE, recuperación y límites Storage. Conector no expone configuración Auth ni Storage HTTP; dashboard usado para ajustes.
- Añadida una Redirect URL exacta http://192.168.1.137:4200/administracion/restablecer, verificada sin comodines. Origen distinto deshabilita recuperación para evitar fallback. Site URL corregida posteriormente al callback local tras el fallo observado por el propietario.
- Implementado envío de recuperación y callback CSR: URL limpiada, exchangeCodeForSession explícito, evento PASSWORD_RECOVERY documentado (redirectType no está en el tipo público SDK), identidad/pertenencia remotas y MFA existente antes de contraseña 12–128 con confirmación; cierre posterior. No crea ni elimina factor.
- Handoff solicitado para prueba privada del propietario: correo/enlace en MISMA pestaña, MFA, contraseña y reingreso. Pendiente; no se enviaron correos con herramientas ni se leyó/cambió contraseña. Recuperación real no certificada.
- Nuevo npm.cmd run verify:storage pasó HTTP anónimo en ambos buckets: listado sin objetos, upload/download/firma rechazados y URL pública HTTP 400. Rutas nuevas inexistentes; falta probar borrador almacenado.
- Preparado botón autenticado Probar Storage real con fixtures ZIP/PNG desechables: upload/upsert, bytes idénticos, anonimato, firma/caducidad 2 s, MIME/tamaño y cleanup en finally/listado vacío. No ejecutado todavía. Puede enviar hasta 50 MiB; no modifica Rumbo ni publica versiones.
- Dashboard confirma FREE con global fijo 50 MB. Bucket ZIP conserva 100 MiB, efectivo sujeto a global; imágenes 5 MiB. Sin cambio de plan/migraciones.
- npm.cmd run check final: 3 API, 17 SQL contando contenedor, 23 Angular, siete rutas; 299,47 kB iniciales/83,26 kB estimados. verify:supabase pasó. Asesor seguridad conserva solo WARN Leaked Password Protection Disabled.
- Revisado callback sin código y recuperar a 320 px, clientWidth=scrollWidth=305. Capturas nuevas fase4-recuperacion-{escritorio,movil}.jpg y fase4-recuperacion-enlace-invalido-escritorio.jpg. Conservadas anteriores. IAB 2 marcada handoff; resumen CUA pendiente del resultado privado.
- Fase 4 abierta: recuperación real, Storage autenticado, publicación/retirada HTTP, usuario normal y caducidad de sesión pendientes. Sin commit/push/despliegue ni cambios Lua.
- Durante el handoff, propietario confirma que el correo abre localhost:3000 sin servidor. Corregida Site URL de Supabase al callback local exacto y verificada persistencia tras recarga; capturada fase4-recuperacion-url-corregida.jpg. Plantilla predeterminada revisada: usa ConfirmationURL, sin SMTP propio ni cambios de plantilla. Pedido correo nuevo y apertura en misma pestaña; resultado pendiente. La primera vuelta fallida no demuestra un cambio de contraseña.

## 18 de noviembre de 2026 — contexto y fase 1

- Inspeccionado el repositorio web: README, rama main y commit inicial `48c41e5`.
- Revisado el fork privado de Rumbo mediante la integración GitHub, sin modificarlo.
- Acordado con el usuario: descarga pública gratuita y aportaciones voluntarias; eliminado el modelo premium.
- Instalado Node 24.22.3 y npm 11.19.1 desde el ZIP oficial, verificando SHA-256.
- El instalador de Git no finalizó; detenido y sustituido por MinGit oficial 2.56.0.windows.4 con hash verificado.
- Configurado PATH de usuario, identidad Git local noreply y protección de archivos sensibles con `.gitignore`.
- Creados `.node-version`, `.nvmrc`, `scripts/check-environment.ps1`, documentación de entorno y alcance.
- Verificados: script de entorno con PATH de usuario/sistema, `npm.cmd ping`, lectura de origin y exclusiones de Git.
- No comprobados: autenticación Git local para push y funcionamiento dentro de WoW.

## 18 de noviembre de 2026 — fase 2 en curso

- Usuario autoriza continuar y solicita memoria persistente para cambiar de conversación.
- Creados `AGENTS.md`, `docs/MEMORIA.md` y este registro para continuidad.
- Consultado npm: Angular CLI estable 22.2.7; no usar 22.3.0-rc.0.
- Consultadas referencias oficiales de Angular sobre prerenderizado y de Vercel sobre funciones Node y configuración.
- Primer intento de descargar CLI interrumpido por ECONNRESET; reintento correcto.
- CLI interpretó incorrectamente un destino absoluto de Windows. Se generó en un directorio temporal usando ruta relativa y se copiaron solo archivos nuevos al proyecto, conservando README, `.gitignore`, documentación y `.git` existentes. No se utilizó `--force`.
- Generado Angular standalone con SCSS, routing y soporte de prerenderizado. Ajustado a salida estática; eliminado servidor Express y sus dependencias.
- Activados TypeScript estricto y `strictTemplates`. Configuradas carga diferida, inicio provisional, ruta desconocida, idioma español, descripción, enlace de salto, foco visible y favicon SVG propio.
- Añadidos `api/health.ts`, adaptador local `server/dev.ts`, proxy local y configuración de tipos independiente para backend. Health solo acepta GET, devuelve estado mínimo y rechaza POST con 405.
- Añadidos scripts de desarrollo y validación, `.env.example` sin secretos, `.gitattributes` y configuración inicial de Vercel.
- Preparada CI de GitHub con permisos de lectura, instalación por lockfile y comprobaciones. No ejecutada remotamente.
- Instalación: 297 paquetes. Framework Angular 22.2.6; CLI/build/SSR 22.2.7; TypeScript 6.0.3; Vitest 5.1.1; tipos Node 24.19.2.
- Primera ejecución de `npm run check`: correcta, con 1 prueba HTTP y 2 de rutas Angular; compilación prerenderiza el inicio.
- Revisados 12 avisos de auditoría: todos transitivos desde picomatch, en herramientas de desarrollo. Aviso GitHub retirado el mismo día; `npm audit --omit=dev` devuelve cero. Detalles en `docs/DEPENDENCIAS.md`.
- Arrancados frontend en 127.0.0.1:4200 y API en 127.0.0.1:3001. El navegador integrado denegó abrir el origen local; no se realizó revisión visual ni se sorteó la denegación.
- Se intentó `npm ci` con el servidor de desarrollo aún abierto y Windows bloqueó un archivo de Sass (EBUSY). Se detuvieron ambos servidores y se repitió: instalación limpia correcta. Los errores transitorios del watcher correspondían a dependencias retiradas por ese intento y desaparecieron tras reinstalar.
- Verificación final después de `npm ci`: tipos correctos, 3 pruebas aprobadas y build correcto; 1 ruta prerenderizada; 247,53 kB iniciales, 71,28 kB de transferencia estimada. `git diff --check` correcto.
- Creadas guías de arquitectura y dependencias. Actualizados README, memoria y registro.
- Fase 2 cerrada técnicamente con revisión visual pendiente explícita. Siguiente: fase 3, diseño y componentes.
- Sin Supabase, Stripe ni Vercel configurados; sin commits nuevos, push ni despliegue. Servidores locales detenidos.

## 18 de noviembre de 2026 — vista previa móvil

- Explicado al usuario el propósito de la API, escrita en TypeScript para Node.js.
- Usuario solicita continuar tras consultar cómo comprobar la web desde el móvil.
- Leída la memoria e inspeccionada la red: conexión Ethernet con perfil privado.
- Arrancado Angular con `npm.cmd start -- --host 192.168.1.137 --port 4200`. Compilación de desarrollo correcta; URL anunciada por Angular: `http://192.168.1.137:4200/`.
- Servidor ligado solo a esa interfaz, no a todas las interfaces. No se han cambiado reglas de firewall ni configuración del router.
- Vista previa retenida para que el usuario la pruebe. API no arrancada: no es necesaria para la pantalla provisional.
- Pendiente confirmación de acceso y revisión visual desde el móvil. No se ha usado otro navegador para eludir la denegación previa del navegador integrado.

## 18 de noviembre de 2026 — capturas solicitadas

- El usuario está fuera de la red local y pide capturas en el chat.
- Nueva apertura autorizada del navegador integrado a la vista previa de red; carga correcta.
- Guardadas capturas reales de página completa en `docs/capturas/rumbo-escritorio.jpg` y `rumbo-movil.jpg`, esta última con viewport 390 × 844.
- Inspeccionadas ambas: texto legible y distribución adaptada, sin recortes visibles. Restaurado el viewport inicial.
- Se mantiene el carácter provisional del diseño. No se han validado aún navegación completa por teclado, dispositivo físico ni proxy API.

## 18 de noviembre de 2026 — fase 3: diseño y páginas públicas

- Usuario solicita capturas tras cada paso hasta que indique que puede revisar en ordenador. Preferencia guardada en AGENTS y memoria.
- Diseñada identidad de cuaderno de exploración con paleta carbón/bosque/dorado, serif del sistema, brújula y mapa conceptual SVG originales. Sin recursos gráficos del juego ni nuevas dependencias.
- Añadidos tokens de estilo, layout responsive y componentes compartidos RouteMap/StatusBadge.
- Construidas páginas de inicio, catálogo, ficha de Rumbo y apoyo. Datos locales tipados del único addon real; ninguna descarga o transacción ficticia.
- Catálogo con búsqueda por varias palabras ignorando tildes, categoría, contador y estado vacío con limpieza.
- Activados prerenderizado de las cuatro rutas, restauración de scroll y anclas. Corregido el salto al contenido para mantener la ruta, en lugar de resolver al inicio por el base href.
- Primeras capturas detectaron palabras unidas al ocultar un salto de línea móvil y solapamiento de título/leyenda en la miniatura; corregidos. Eliminado pequeño exceso de presupuesto CSS.
- Verificados en navegador búsqueda sin resultados, limpieza, enlaces, ancla de instalación y foco en main al activar el salto con Enter. Mediciones sin desbordamiento en cuatro páginas a 320 y 390 px.
- Capturas reales desktop/móvil de las cuatro páginas en `docs/capturas/fase3-*.jpg`. Viewport restaurado al finalizar; página de inicio mantenida como entregable.
- `npm.cmd run check`: tipos correctos, una prueba API y tres Angular aprobadas; cuatro rutas prerenderizadas, 274,44 kB iniciales y 76,03 kB estimados de transferencia. Sin avisos de presupuesto. `git diff --check` correcto.
- Añadida guía `docs/DISENO.md`. No se han tocado Supabase, Stripe o el addon Lua; sin commits, push ni despliegue.
- Siguiente fase: Supabase, permisos y autenticación administrativa.

## 18 de noviembre de 2026 — corrección: plataforma para varios addons

- Usuario aclara que Rumbo es un addon del catálogo y la web debe reunir todos los que se creen. Acepta «WoW Forever Addons» como nombre provisional.
- Sustituidos marca global, cabecera, pie, favicon, títulos de rutas y metadatos. La ficha conserva el nombre Rumbo como producto.
- Portada centrada en la colección. Extraído CollectionPreview con cantidad y enlaces derivados de ADDONS, sin productos inventados.
- Página de apoyo referida al mantenimiento de la plataforma y a todos sus addons, no exclusivamente a Rumbo.
- Conservados catálogo y arquitectura. Supabase y las fichas conectadas se implementarán en las siguientes fases.
- `npm.cmd run check`: tipos correctos, cuatro pruebas aprobadas, cuatro rutas prerenderizadas, sin avisos. 274,40 kB iniciales y transferencia estimada de 75,93 kB.
- Comprobada navegación y ausencia de desbordamiento en portada/apoyo a 320 px; capturas de 1440 y 390 px guardadas con prefijo `plataforma-`.
- Memoria, alcance e instrucciones actualizados para evitar que otro chat vuelva a tratar Rumbo como la plataforma. Sin push ni despliegue.

## 18 de noviembre de 2026 — fase 4A sin cuenta Supabase

- Usuario solicita avanzar sin estar en casa; autoriza preparar migraciones y permisos sin proyecto remoto.
- Confirmado que no están disponibles Docker ni psql. Consultada documentación primaria de Supabase y PGlite.
- Creadas dos migraciones transaccionales: catálogo multiaddon con RLS, pertenencia administrativa privada, restricciones de publicación y políticas de objetos en Storage.
- Buckets privados addon-files/addon-images; acceso anónimo solo a objetos asociados a publicaciones visibles. Administra solo la pertenencia guardada en private.admin_users; el usuario no puede concederse permisos.
- Seed idempotente con Rumbo y versión 0.3.0 en borrador, sin archivos ni administradores. No se ha publicado contenido sin revisión.
- Añadido PGlite 0.5.16 como dependencia de desarrollo para probar SQL/RLS sin Docker. El bootstrap mínimo de auth/storage existe solo en tests y no debe ejecutarse en Supabase.
- Añadido `npm.cmd run test:db` al comando check y, por tanto, a la CI existente.
- Pruebas ejecutadas: 14 escenarios (15 tests contando contenedor), cubren lectura anónima, denegación de escritura/promoción, publicación incompleta, archivos huérfanos/borradores, buckets ajenos, retirada, padre no publicado, aislamiento entre addons, fechas futuras, categorías ocultas, RLS y revocación de admin.
- `npm.cmd run check` completo correcto; API y Angular también pasan; cuatro rutas prerenderizadas, mismo bundle que antes. Consultas de `supabase/verify.sql` probadas contra la base efímera.
- `npm.cmd audit --json`: cero vulnerabilidades en el árbol completo. No se silenciaron avisos ni se forzó una degradación.
- Documentado modelo, matriz de acceso, descarga gratuita desde buckets privados, limitación de URLs firmadas y siguiente validación remota. Añadidos nombres de variables vacíos, sin credenciales; no se exportan al frontend.
- Interfaz sin cambios. Capturas reales del catálogo en escritorio/móvil con prefijo fase4a-. Registro y memoria actualizados.
- Sin proyecto remoto, migraciones aplicadas remotamente, Auth, MFA o API real de Storage. Fase 4B pendiente. No hay commits, push ni despliegue.

## 18 de noviembre de 2026 — acceso administrativo preparado sin proveedor remoto

- Usuario acepta preparar pantallas, estados y configuración sin estar en casa. Leídas memoria, instrucciones, alcance y registro.
- Consultadas referencias oficiales de Angular (formularios y guards) y Supabase (claves).
- Añadido AdminAuthGateway inyectable con proveedor predeterminado sin configurar. Servicio de estados, comprobación de acceso y guard que no autoriza ante ausencia de proveedor o error.
- Creados acceso, recuperación y denegación con layout común; enlace al acceso en el pie. Formularios desactivados sin conexión, sin enviar contraseñas o correos. Validación y mensajes funcionales comprobados con adaptadores solo de prueba.
- Contraseña limpiada tras intento con proveedor; error genérico; recuperación neutral; sin alta pública ni destinos de retorno arbitrarios.
- `/administracion` solo contiene un marcador bajo guard, no panel de edición. Ningún rol falso ni acceso de demostración disponible en la web.
- Añadido lector backend de configuración pública con lista permitida y validación de URL/clave; no exporta secretos ni se ha enlazado todavía al frontend.
- Preparados meta robots noindex y cabeceras de Vercel no-store/noindex para administración. Reescritura exacta al shell CSR para `/administracion`; validación de infraestructura pendiente del despliegue.
- `npm.cmd run check`: 2 tests API, 14 escenarios SQL (15 contando contenedor), 11 tests Angular; build de siete rutas prerenderizadas correcto, sin avisos. 294,55 kB iniciales, 81,50 kB estimados de transferencia.
- En navegador hubo que recargar para actualizar la configuración de rutas tras HMR; después se comprobaron navegación, recuperación, bloqueo de administración, campos desactivados y metadatos. Sin errores capturados en consola.
- Comprobadas las tres pantallas a 320 px sin desbordamiento. Capturas escritorio/móvil guardadas con prefijo admin-. Viewport restaurado, pestaña mantenida como entregable.
- Añadida guía ADMINISTRACION y actualizada memoria. La fase 4 permanece abierta: no hay proyecto remoto, adaptador Supabase, login, correos, MFA, restauración de contraseña efectiva ni panel funcional.
- Sin nuevas dependencias ni cambios al addon. Sin commits, push o despliegue.

## 18 de noviembre de 2026 — proyecto Supabase real

- Confirmado proyecto wow-forever-addons, ref irhmsatozdhbvosgwqua, eu-west-1, PG 17.12, inicialmente vacío. Usado conector Supabase tras conectarlo el usuario.
- Aplicadas migraciones catalog, storage y policy_consolidation. Versiones locales renombradas a 20261118193901, 20261118193910 y 20261118194059 para coincidir con historial remoto. No se instalaron CLI ni Docker.
- Verificadas cinco tablas con RLS, dos buckets privados y ausencia de grants cliente sobre private.admin_users. Consolidación de políticas evita evaluaciones SELECT duplicadas. Asesores sin avisos de seguridad; rendimiento solo INFO de índices sin uso, retenidos para consultas futuras.
- Bootstrap idempotente con IDs generados: categoría navegación, Rumbo y 0.3.0 en borrador, sin aprobación ni archivo. Sin usuarios ficticios ni objetos Storage insertados por SQL.
- Recuperada únicamente configuración pública, guardada en .env ignorado. Generados tipos de base de datos. No se obtuvo clave secret/service_role ni contraseña.
- Desactivadas altas públicas en dashboard Auth; recarga y HTTP confirman persistencia. Anónimos Auth desactivados, confirmación de correo activada.
- npm.cmd run verify:supabase pasó contra servicio real con clave pública: categoría accesible, borradores ausentes, esquema privado no expuesto, altas desactivadas. Script de solo lectura independiente de CI. No prueba Storage ni sesiones.
- npm.cmd run check completo pasó: tipos, 2 tests API, 15 SQL contando contenedor, 11 Angular y siete rutas prerenderizadas; 294,55 kB /81,50 kB estimados. Sin cambios visuales a la web.
- Usuario comunicó correo para administrador, no registrado en documentos. Auth aún sin usuarios. Preparado formulario vacío de alta manual, sin enviar invitaciones ni credenciales. Propietario debe crear contraseña directamente en Supabase; luego verificar identidad y asignar pertenencia mediante SQL.
- Capturas reales del ajuste Auth y del formulario de creación en escritorio/móvil guardadas en docs/capturas/supabase-*.jpg. Pestaña marcada handoff pendiente del usuario. Fase 4 abierta, sin login real, MFA, panel funcional, push ni despliegue.

## 18 de noviembre de 2026 — propietario confirmado

- Conector instalado confirmado. Consulta posterior encuentra una cuenta coincidente con el correo solicitado y correo confirmado; sin obtener contraseña.
- Asignada pertenencia idempotente en private.admin_users por selección del usuario real confirmado. Verificado un administrador coincidente.
- Comprobación transaccional con rol authenticated y sujeto real: private.is_admin verdadero y borrador Rumbo accesible. Contexto de pruebas revertido. No representa inicio de sesión HTTP ni validación JWT real.
- Próximo paso: adaptador Supabase de la web, comprobación limitada de pertenencia, MFA y sesiones reales. Formulario web aún desactivado.
- Alta observada también en dashboard tras recarga; handoff de credenciales terminado. Capturas supabase-usuario-creado-escritorio.jpg y supabase-usuario-creado-movil.jpg. La tabla externa requiere desplazamiento horizontal en móvil. La cifra Total: 10 users (estimated) del dashboard es una estimación; la consulta exacta confirmó una cuenta coincidente.

## 18 de noviembre de 2026 — Auth real y MFA

- Usuario ya está en casa; se le proporcionó acceso local y confirmó Área de gestión tras iniciar sesión y vincular el autenticador. Ya puede revisar visualmente en ordenador; actualizada preferencia de capturas.
- Consultados changelog y documentación primaria de Supabase, guías Supabase y Postgres best practices. Instalado SDK exacto 2.119.1; audit sin vulnerabilidades. Supabase CLI 3.2.0 usado mediante npx solo para crear archivo de migración, sin nueva dependencia del proyecto ni Docker.
- Endpoint GET /api/public-config con allowlist URL/publishable y no-store. Ausencia o configuración inválida falla cerrada. Proxy local hacia API; sin exponer entorno ni claves secretas.
- SupabaseAdminGateway diferido: getUser remoto y RPC admin_access sin parámetros. Sesión por pestaña en sessionStorage, sin guardar contraseña. Login devuelve MFA pendiente, cuenta denegada o administrador; no confía en user_metadata ni solo getSession.
- Migración 20261118195617_admin_mfa aplicada y tipos regenerados. Archivo creado con CLI y renombrado al historial remoto. is_admin exige pertenencia + aal2 en todas las políticas, incluido Storage. Funciones definer solo en private con search_path vacío y auth.uid; wrapper público invoker solo authenticated.
- Ruta /administracion/verificar CSR con alta TOTP por click explícito, QR solo en memoria de página y verificación challengeAndVerify. No crea factor al visitar ni registra QR, semilla o códigos. No se capturaron credenciales con herramientas.
- Nuevas pruebas SQL detectaron inicialmente falta de permiso en el helper interno para visitantes; corregido antes de aplicar remotamente, manteniendo helper interno no expuesto y is_admin definer protegido. Suite completa pasa.
- npm.cmd run check pasó: 3 API, 16 escenarios SQL (17 contando contenedor), 18 Angular y build sin avisos; siete rutas prerenderizadas, 297,71 kB /82,87 kB estimados. SDK diferido 226,14 kB /50,08 kB.
- verify:supabase HTTP real pasó, incluido rechazo anónimo de RPC. SQL remoto en transacción revertida comprueba borradores denegados con aal1 y permitidos con aal2. No presentar esos claims simulados como login real.
- Login y MFA reales comprobados por propietario y observados en IAB3; consulta exacta confirma una pertenencia y un TOTP verificado. Logout real y acceso directo posterior vuelven al login. Capturas admin-conectado y admin-verificado en escritorio/móvil, sin secretos. Sin overflow a 320 px en acceso.
- Angular tuvo caché prebundle obsoleta tras cambio de dependencias; reiniciado y comprobado sin errores. Sesión Angular actual19342 en 192.168.1.137:4200, API45982 en 127.0.0.1:3001. No se alteró firewall o router.
- Asesor de seguridad avisa Leaked Password Protection Disabled; función Pro o superior, no contratada. Documentada con enlace oficial en ADMINISTRACION.md. No hay otros avisos de seguridad reportados en esa comprobación.
- Área protegida sigue como marcador con cierre de sesión. Recuperación se mantiene desactivada y no envía correos hasta callback/URLs verificadas. Pendientes recuperación, reingreso/caducidad y Storage HTTP real para cerrar fase4.
- Memoria, administración, Supabase, arquitectura y README actualizados. Sin commit, push, despliegue, cobros ni cambios al addon.
# 19 de noviembre de 2026 — paginación y variantes de imagen

- Continuación autorizada; servidores4200/3001 comprobados, preview auxiliar4201 aislado. Recuperación sigue aplazada sin correos ni credenciales. Sin publicar Rumbo.
- Migración20261119112302_catalog_pagination aplicada, octava total, tipos regenerados. RPC invoker y RLS; búsqueda literal/acento común, cursores ligados a filtros, límite25 e índice parcial. Prueba remota con18 publicaciones técnicas, keyset y draft oculto bajo anon, ROLLBACK completo. No quedaron filas ni archivos.
- Separación de catálogo resumido paginado12 y ficha completa individual; snapshot SSR por slug. Categorías independientes, errores/reintento, abort y deduplicación. Sitemap por slugs200, guard49997 productos; categorías guard5000; error al exceder. Fallo400 real PostgREST14 al filtrar embeddings de RPC corregido con selección de claves y segundo GET de12 resúmenes. HTTP remoto a través de API local200 vacío, Rumbo404, health200.
- Sharp0.35.5 fijado y npm audit0. WebP320/640/1280 con límites y eliminación de metadatos sin alterar originales; tamaño opcional conserva redirect303 previo. Srcset/lazy y corrección de imagen cargada antes de hidratación. Diagnóstico de publicación consulta su fixture porID; ampliación sin ejecutar con sesión real.
- npm.cmd run check PASS:11 API,21 SQL contando contenedor,69 Angular,1 SSR; siete prerender;320,41kB/89,00kB estimados. Pruebas de SQL/RLS, transportes HTTP controlados y Sharp nativo. Build preview `node ../../node_modules/@angular/cli/bin/ng.js build --configuration pagination` PASS. git diff --check PASS antes del cierre documental.
- CUA preview26 ejemplos:12→24→26, sin botón al final, búsqueda Herramienta26 devuelve1; imágenes card cargadas, sin overflow320/390px. Capturas fase8-paginacion-preview-escritorio.jpg y fase8-paginacion-preview-movil.jpg con aviso visible; preservadas anteriores. Viewport restablecido. Servidor preview detenido al finalizar.
- Lectura final remota: Rumbo draft/no aprobado1, otros addons0, storage.objects0. Primer SELECT de comprobación usó columna approved_at inexistente y falló sin mutación; corregido a distribution_approved. Asesor solo aviso conocido Leaked Password Protection Disabled. Documentación/memoria actualizadas; sin commit,push,despliegue o Lua.
- Pendientes: imagen publicada auténtica y pruebas administrativas HTTP con propietario, recuperación aplazada, benchmark a escala, dominio y validación nativa Sharp/SSR en Vercel. Siguiente bloque: preparar aportaciones voluntarias de pruebas. No se declaran cerradas fases4/7/8.




Captura de esta revisión guardada y comprobada visualmente: docs/capturas/fase9-paquete-revisado.jpg. Informe de comprobaciones locales reales; no vista administrativa ni despliegue. Auxiliar4203 detenido;4200/3001 conservados. Se preservan capturas anteriores.

Primer push rechazado por GitHub Push Protection: falso positivo en clave live sintética de tests/api/support-checkout.test.ts. Ninguna coincidencia con claves privadas locales. Se construyen claves sintéticas por prefijo separado, se repite test Checkout y se corrige el commit aún no publicado, sin omitir protección ni force-push.

Subida completada y SHA remoto verificado: main 1c78b5ca15f066c3a63a0e520cecc1c0db16d4ab. Checkout tests2/2 tras corregir fixtures; comprobación paquete14/14. GitHub aceptó push sin excepción de protección y sin force. gh no está instalado; no se afirma CI remota aprobada. Vercel aún no desplegado. Informe local de entrega fase9-github-informe.html; captura se intentará con control Windows, no Dashboard. Recargar importación antes de configurar build y variables.

No nueva captura Windows de entrega: Chrome muestra resultado de autenticación de Git Credential Manager y no se automatiza esa pantalla. Informe HTML local de entrega disponible; captura anterior del paquete conservada. Auxiliar4203 detenido. Se guardan en commit documental los resultados de la subida.

Resultado alojado tras push0e14fc9 y despliegue automático:17/18 comprobaciones PASS. public-config/catalog200; Checkout200 enabled=false/mode=test; status/webhook405 por GET; download/image404 sin identificador; sitemap503 esperado por dominio canónico sin configurar. Todos los500 anteriores desaparecen. Solo /no-existe mantiene200; pendiente independiente, no se declara aceptación integral. Pruebas locales20 API/24 SQL/80 Angular/1 SSR/1 empaquetado aprobadas. Comprobaciones anónimas de solo lectura, no descarga positiva ni sesión administrativa.

Resultado confirmado en producción tras e28931b:18/18 comprobaciones HTTP anónimas PASS. /no-existe404, inicio/catalogo/apoyar200, administración no-store/noindex, API funcionales y Stripe desactivado. No equivale a probar sesión administrativa, descarga positiva, correo o recuperación. Se prepara captura de página pública alojada, sin login ni fixtures.

Captura fase9-404-vercel-real.jpg comprobada visualmente en Chrome: página pública realmente alojada en /no-existe, no fixture ni sesión administrativa. HTTP404 confirmado por petición independiente. Capturas anteriores preservadas. Siguiente: revisión visual y acceso/MFA del propietario en entorno alojado; recuperación sigue pendiente.

Captura nueva no obtenida: Chrome se abrió en selector de perfiles; intento de abrir invitado devolvió coordinate input geometry is unavailable. No se automatizó login ni perfil personal. Vista aislada compilada disponible en loopback4201; capturas anteriores preservadas. Se entrega funcionalidad para comprobar con sesión del propietario.

Despliegue d8c9357 comprobado: ruta nueva200 con no-store/noindex y ruta presente en bundle alojado (nombre de componente minificado no localizado por búsqueda literal). Smoke público18/18 PASS. Creación real con sesión administrativa queda pendiente de que propietario use Nuevo addon; no afirmar INSERT real probado.

7774aeb desplegado en main; status Vercel success. Revisada visualmente página real /administracion/recuperar en navegador integrado: tras hidratación desaparece aviso de origen y campo correo/botón Solicitar enlace habilitados. Captura fase4-recuperacion-vercel-habilitada.jpg sin correos/códigos, guardada en workspace principal. Nueva herramienta CUA permite ahora leer pestaña integrada, a diferencia del bloqueo Windows anterior; no extrapolar a revisión de tres mejoras (sigue aplazada). Se deja pestaña como handoff para usuario. Siguiente: usuario solicita solo un correo nuevo, usa enlace en mismo navegador/dispositivo, completa MFA y contraseña manualmente y confirma nuevo login. No se ha solicitado correo ni cambiado contraseña por agente; recuperación no cerrada todavía.
