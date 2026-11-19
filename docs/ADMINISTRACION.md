# Acceso administrativo conectado

## Categorías — actualización19/11

Nueva ruta protegida /administracion/categorias para creación oculta y edición con revisión/motivo; nombre, identificador único, orden entero y visibilidad. Ocultar afecta a hijos por RLS sin modificar su estado; mostrar puede reactivar publicaciones existentes. Cada guardado usa RPC invoker con pertenencia/MFA y timestamp esperado y deja evento inmutable para roles de aplicación. Controles bloqueados tras conflicto hasta recarga. Siete migraciones remotas; prueba transaccional aprobada, prueba HTTP del propietario pendiente. Capturas fase7-categorias-preview-*.jpg con datos ficticios. No se tocó Rumbo.


## Imágenes en la ficha pública — actualización19/11

Las imágenes publicadas desde revisión editorial se incorporan a la galería cuando el addon aprobado y su categoría están visibles. Orden por sort_order con desempate id. Ocultar imagen o padre bloquea nuevas firmas; un enlace emitido puede vivir60s. Diagnóstico de publicación ampliado para comprobar imagen HTTP idéntica y404 con padre/categoría ocultos; ejecución real pendiente del propietario. No se publicó Rumbo.


## Revisión editorial — 19 de noviembre

Desde gestión, Revisión y publicación abre la ficha editorial. Se aprueba primero la distribución, después una versión y finalmente la ficha. El servidor comprueba categoría visible y archivo registrado. Publicar imágenes y editar texto/orden son operaciones separadas. Motivo y confirmación explícitos antes de guardar. Ante conflicto o respuesta incierta se bloquea el reintento y se pide recargar para revisar el historial.

Retirar addon oculta sus hijos y revoca aprobación. Retirar versión conserva ZIP y requiere devolver a borrador antes de republicar. Enlaces emitidos pueden durar60s. Subidas de nuevas versiones e imágenes privadas también disponibles en addon publicado. No hay borrado/reemplazo permanente desde el panel.

Historial de100 eventos recientes con acceso admin+MFA, append mediante triggers privados y roles de aplicación sin permisos de modificación. Incluye operación/fecha/identidad/nota/metadatos; campos largos no se duplican, sus nombres cambiados sí se registran en base. No registra tokens ni contraseñas. Seis migraciones aplicadas, tipos regenerados. Check4 API/19 SQL/53 Angular; QA visual y HTTP del flujo nuevo pendiente de login manual. Rumbo intacto en borrador. Recuperación sigue aplazada. Este bloque prevalece sobre los pendientes históricos inferiores.


## Subidas privadas — 19 de noviembre

Desde Editar borrador, Gestionar imágenes y ZIP abre la ruta protegida de archivos. Permite crear versiones en borrador y adjuntar ZIP hasta50MiB; una versión que ya tenga ZIP no se sobrescribe. Imágenes PNG/JPEG/WebP hasta5MiB con texto alternativo/orden. Las operaciones revalidan identidad y MFA y mantienen archivos privados y metadatos en borrador. No hay aprobación/publicación implícita.

ZIP comprobado por índice/rutas y manifiesto .toc, con límites de entradas/tamaño declarado; no se extrae ni ejecuta. SHA256 completo mediante noble-hashes, disponible en HTTP de red local. Imágenes con firma/extensión y decodificación real, hasta8192px/lado y32MP. La vista previa usa descarga autenticada y blob local revocado al salir. No constituye análisis antivirus o validación en juego.

Si falla la asociación, se comprueba si el servidor llegó a guardar antes de borrar la subida nueva. Si no puede verificarse el estado o el objeto está referenciado, se conserva y se informa para revisión. Limpieza comprobada por permisos/listado, sin usar service_role. Pruebas reales positivas y de formato falso aprobadas con fixture propio; limpieza autorizada y completada: cero archivos y filas temporales por consulta remota, Rumbo intacto. Evidencia: capturas/fase7-subidas-limpieza-final.png. Check:4 API,18 SQL contando contenedor y47 Angular.

Pendientes: eliminación/reemplazo de contenido real, galería pública, publicación/retirada editorial y auditoría. Recuperación de contraseña sigue sin resolver y aplazada.

## Editor de borradores — 19 de noviembre

El panel /administracion ya muestra borradores reales. Editar borrador abre /administracion/addons/:id con nombre, dirección, categoría, resumen, descripción, instrucciones de instalación, autoría, licencia y créditos. Las versiones existentes en borrador tienen formulario independiente de versión/cliente/interfaz/novedades. La vista previa es privada y no publica nada. Guardar ficha y Guardar versión son operaciones separadas.

Cada operación revalida identidad/pertenencia/MFA en Supabase; RLS sigue exigiendo aal2. Solo se envían campos permitidos; no hay controles de aprobación, publicación ni rutas de archivos. Se exige coincidencia de updated_at y estado draft para no sobrescribir otra edición. Si hay conflicto se conserva el texto y se requiere recarga; la recarga/salida con cambios pide confirmación. No hay guardado automático. Noindex/nofollow comprobado y retirado al abandonar el editor.

Migración 20261118225704 añade installation_instructions con máximo 30000 caracteres, sin cambiar permisos. Cinco migraciones aplicadas; no reaplicar. Guardado y conflicto probados por HTTP/UI reales con fixture privado ya eliminado. Rumbo permanece intacto en borrador. Check final: 4 API, 18 SQL contando contenedor, 37 Angular y build correcto. Capturas fase7-*.jpg.

Siguiente tramo: crear/subir imágenes y versiones ZIP y después publicación/retirada de contenido real con auditoría. No es todavía el panel completo. Recuperación sigue fallando y queda aplazada por decisión del usuario. Se conserva el aviso conocido [protección de contraseñas filtradas desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), sin cambio de plan.

## Actualización más reciente: recuperación y Storage

Catálogo y descarga de la web ya conectados; diagnóstico Probar publicación y retirada ampliado y ejecutado en sesión real: once resultados aprobados, incluido ZIP idéntico a través de /api/download y404 tras retirada. Usa siempre permisos de visitante para endpoints públicos. Limpieza remota confirmada; Rumbo intacto. Recuperación sigue fallando y aplazada por decisión expresa del usuario, sin nuevos correos.

Publicación y retirada HTTP ya verificadas posteriormente por el propietario: nueve resultados correctos del botón, incluidos descarga sin cuenta/pago, borradores protegidos, escritura anónima denegada, retirada/nuevas firmas/caducidad y ocultación por padre/categoría. Consulta remota confirma limpieza completa (sin fixtures ni objetos) y Rumbo en borrador sin aprobación. Login resuelto: el propietario corrigió la contraseña introducida; no se cambió la cuenta ni MFA. Prevalece sobre las menciones históricas inferiores de prueba sin ejecutar. Recuperación real continúa aplazada y pendiente.

Nuevo botón Probar publicación y retirada, preparado y compilado; pendiente ejecución por el propietario. Crea únicamente fixtures propios etiquetados, publica unos segundos ZIP vacío/píxel, comprueba acceso anónimo y retirada/ocultación y elimina archivos y filas al terminar. No publica Rumbo. Verifica nuevas firmas denegadas tras retirada y caducidad de enlaces previos; no promete revocar inmediatamente URLs emitidas. No cerrar fase4 hasta obtener resultado real y resolver pendientes.

Storage autenticado ya comprobado posteriormente: propietario ejecutó el botón con sesión real y MFA y entregó los doce resultados correctos. Ambos buckets pasan subida/reemplazo/descarga idéntica, bloqueo anónimo de borrador existente/URL pública, firma/caducidad HTTP, MIME/tamaño y limpieza. Consulta remota posterior confirma cero objetos _verification/ y buckets privados. También comprobado reingreso con MFA existente. Sustituye las menciones inferiores de diagnóstico aún sin ejecutar; recuperación real continúa pendiente.

Corrección posterior (18/11,22:30 Madrid): el propietario confirma fallo real del callback y posteriores reenvíos bloqueados. Logs confirman HTTP429 over_email_send_rate_limit (último22:26:11 Madrid). Proveedor integrado:2 correos/hora; siguiente intento aconsejado desde23:30, sin garantía de hora exacta. No cambió contraseña. No enviar correos adicionales de prueba ahora.

auth-storage ahora comparte SOLO verificadores PKCE entre pestañas, con caducidad1h, manteniendo tokens/sesiones en sessionStorage. Restaura comprobación previa si el envío falla; mensaje específico429 y pausa local1h. Abrir enlace en MISMO navegador/dispositivo, puede ser otra pestaña. Las instrucciones inferiores que exigen la misma pestaña quedan sustituidas. Los enlaces anteriores a esta corrección necesitan solicitud nueva. No se eliminó MFA ni se autorizó desde el navegador sin verificación remota.

Prueba con SDK real y Auth simulado confirma intercambio entre dos pestañas y evento PASSWORD_RECOVERY sin compartir sesión; no equivale a correo ni contraseña reales. check:3 API,17 SQL contando contenedor,28 Angular y build correcto. Recuperación real pendiente de repetir cuando permita la cuota. Fuente:https://supabase.com/docs/guides/auth/rate-limits

Recuperación implementada y habilitada solo desde http://192.168.1.137:4200, con Redirect URL exacta /administracion/restablecer registrada. Callback CSR con intercambio PKCE, evento PASSWORD_RECOVERY, getUser/pertenencia y MFA existente antes de guardar contraseña de 12–128 caracteres. Limpia URL y campos, cierra sesión y conserva el factor. Los apartados inferiores que indican recuperación desactivada son históricos.

El enlace debe abrirse en la MISMA PESTAÑA que solicitó la recuperación, por sessionStorage. Recargar el formulario exige enlace nuevo. No compartir contraseñas/códigos/enlaces. Handoff privado solicitado al propietario; correo, cambio y reingreso siguen pendientes. Site URL corregida al callback local tras el retorno erróneo observado por el propietario a localhost:3000; configurar origen definitivo antes de producción.

Área de gestión incluye Probar Storage real: archivos generados, subida/reemplazo/descarga, borrador oculto, firma/caducidad, MIME/tamaño y limpieza. Preparado, SIN ejecutar con sesión real. No publica catálogo. Global FREE confirmado en dashboard: 50 MB; bucket ZIP declara 100 MiB pero prevalece global; imágenes 5 MiB.

`npm.cmd run verify:storage` pasó HTTP anónimo con rutas inexistentes: sin listado ni subida/descarga/firma, URL pública denegada en ambos buckets. No sustituye la prueba de archivo real. `npm.cmd run check`: 3 API, 17 SQL contando contenedor y 23 Angular; build correcto. Capturas fase4-recuperacion-*.jpg; sin overflow a 320 px. Asesor conserva el aviso documentado inferior.

## Estado comprobado

El propietario creó su cuenta directamente en Supabase. Angular utiliza Supabase Auth real con @supabase/supabase-js 2.119.1 (versión exacta). El usuario confirmó que completó el acceso y llegó a Área de gestión; una consulta remota confirmó una pertenencia administrativa y un factor TOTP verificado. No se obtuvieron contraseñas, semillas TOTP ni tokens de sesión mediante herramientas.

La pantalla de administración contiene un marcador y cierre de sesión; la edición de addons se implementará en su fase. La recuperación sigue explícitamente desactivada hasta implementar el callback de cambio de contraseña y probar las URLs/correos. La fase 4 continúa abierta para recuperación y Storage real.

## Recorrido

1. /administracion/acceso acepta correo y contraseña, los envía directamente a Supabase por HTTPS y limpia el campo tras el intento.
2. El adaptador valida la sesión con getUser y consulta admin_access sin parámetros. Nunca autoriza con getSession ni con user_metadata.
3. El RPC SECURITY INVOKER responde solo sobre la cuenta actual: forbidden, mfa-required o admin. No expone private.admin_users ni acepta el UUID de otra persona.
4. Si falta MFA se abre /administracion/verificar. La visita no crea credenciales; el propietario debe pulsar Configurar autenticador. QR y código permanecen en la página, no en logs, documentación o capturas.
5. El código se verifica con challengeAndVerify y se vuelve a consultar la autorización antes de entrar.
6. El guard revalida cada entrada. RLS exige pertenencia Y aal2 para borradores/escrituras en tablas y Storage, aunque se omita el frontend.
7. Cierre de sesión revoca la sesión actual y limpia almacenamiento local incluso ante fallo remoto. Se usa sessionStorage por pestaña; no se guarda contraseña. Un token ya emitido puede permanecer válido hasta caducar, por lo que revocar sesión no equivale a invalidarlo inmediatamente. Retirar pertenencia sí bloquea operaciones privilegiadas al consultar RLS.

## Separación y configuración

AdminAuthGateway mantiene la frontera del adaptador. SupabaseAdminGateway carga el SDK de forma diferida. La inicialización obtiene /api/public-config, con no-store y únicamente URL + publishable key; no serializa process.env. La configuración ausente o inválida mantiene acceso deshabilitado. El prerender no crea cliente Auth ni obtiene configuración privada.

El SDK usa flowType pkce, detectSessionInUrl false y almacenamiento de sesión en la pestaña. La recuperación se habilitará junto con su intercambio de código explícito y una lista de destinos controlados. Actualmente no se envían correos desde la web.

Las funciones con SECURITY DEFINER están solo en private, tienen search_path vacío y consultan auth.uid. has_admin_membership no concede acceso a datos; is_admin añade la exigencia aal2. El wrapper público es INVOKER y solo authenticated tiene EXECUTE. No añadir private a esquemas expuestos.

Migración 20261118195617_admin_mfa aplicada remotamente y tipos regenerados. Creada inicialmente con Supabase CLI 3.2.0 y renombrada para coincidir con la versión del historial asignada por el conector. No reaplicar.

## Comprobaciones

- npm.cmd run check: 3 pruebas API, 16 escenarios SQL (17 contando contenedor), 18 Angular y build correcto; siete rutas prerenderizadas, 297,71 kB iniciales /82,87 kB estimados. SDK Auth diferido: 226,14 kB /50,08 kB estimados.
- Pruebas del adaptador: fallo de validación remota nunca autoriza, MFA pendiente, revocación, ausencia de alta automática de factor, rechazo de no administrador, comprobación tras MFA y limpieza ante fallo de logout.
- SQL local: aal1 no ve borradores, no modifica y no sube archivos; solo ve los objetos ya publicados. aal2 + pertenencia permite administrar. Anónimos no pueden ejecutar el RPC.
- SQL remoto transaccional con rol authenticated: aal1 requiere MFA y oculta borradores; aal2 permite al administrador leer Rumbo. Es un contexto SQL simulado, distinto de la sesión real probada por el propietario.
- npm.cmd run verify:supabase: HTTP anónimo real confirma catálogo borrador oculto, esquema privado no expuesto, altas públicas bloqueadas y RPC administrativo denegado.
- Navegador: formulario habilitado, navegación protegida sin sesión redirige al acceso, consola sin errores tras reiniciar dev server por cambio de dependencias. Sin desbordamiento a 320 px. Capturas admin-conectado-{escritorio,movil}.jpg previas al acceso, sin datos sensibles.
- Login y MFA reales: confirmación del usuario de Área de gestión, observación en IAB3 y un TOTP verificado en Supabase. Cierre real mediante la interfaz y acceso directo posterior comprobados: vuelve al login. Capturas admin-verificado-{escritorio,movil}.jpg. Reingreso con factor ya vinculado, caducidad y recuperación aún pendientes.

## Aviso del asesor

El asesor remoto señala Leaked Password Protection Disabled. Esta función requiere Pro o superior según la documentación consultada; no se contrató ni cambió el plan gratuito. MFA y pertenencia sí se exigen en RLS. Revisar antes de producción: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Arranque local

npm.cmd run start:api (loopback 127.0.0.1:3001), y Angular con proxy a /api. Vista previa actual http://192.168.1.137:4200/administracion/acceso. API retenida en sesión 45982; Angular reiniciado en 19342. Comprobar procesos al retomar; no son servicios persistentes. No hay despliegue.

## Referencias

- https://supabase.com/docs/reference/javascript/auth-getuser
- https://supabase.com/docs/reference/javascript/auth-mfa-enroll
- https://supabase.com/docs/reference/javascript/auth-mfa-challengeandverify
- https://supabase.com/docs/guides/auth/auth-mfa
- https://supabase.com/docs/guides/database/postgres/row-level-security
# Reemplazo y eliminación de borradores — actualización19/11

UI preparada localmente con revisión, motivo, casilla, CAS y limpieza recuperable. Protección SQL/Storage aplicada selectivamente en migración20261119144321, tipos regenerados. Contrato ya instalado; si falta o falla sesión el panel se cierra antes de blobs. Detalles/evidencia en [ARCHIVOS.md](ARCHIVOS.md). Validación SQL remota revertida aprobada sin blobs; nueva prueba HTTP del propietario con archivos desechables sigue pendiente. Las pruebas históricas no validan este nuevo flujo. No se ha eliminado ningún archivo remoto ni desplegado la UI.
