# Gestión segura de archivos en borrador — 19/11

Implementada y comprobada localmente; migración20261119144321 aplicada selectivamente en Supabase. No se han eliminado archivos reales. No sustituye la prueba HTTP con sesión MFA del propietario.

## Comportamiento

El área de archivos permite revisar un reemplazo de ZIP/imagen o su eliminación. Exige motivo12–1000 caracteres y casilla explícita sobre eliminación sin papelera. No confirma al abrir la revisión. Cancelar no muta, devuelve foco al botón de origen y el guard de salida contempla revisión/limpieza pendiente. Otros formularios se desactivan durante la revisión o procesamiento.

El ZIP retirado deja la versión en borrador con ruta, tamaño y SHA nulos. Eliminar imagen retira su fila. El reemplazo conserva ID y metadatos de la versión/imagen, y genera un objeto nuevo en addonUUID/entidadUUID/revisionUUID.ext, sin upsert. ZIP hasta50MiB e imagen hasta5MiB con validadores ya existentes. Los paths antiguos planos siguen aceptados por la API pública; nunca se usa el nombre del fichero recibido como ruta.

Se sube el nuevo objeto, se cambia su asociación con CAS updated_at y después se limpia el objeto anterior mediante Storage API. Respuesta perdida se reconcilia leyendo la fila. Ante lectura incierta se conservan los objetos y se bloquea continuar hasta recargar. Conflicto limpia únicamente la subida nueva si logra reservar su retiro. No se borra un objeto que continúe referenciado. Cambio confirmado con fallo de eliminación se distingue de error de guardado: limpieza pendiente, recuperable desde registro del servidor tras recarga. No hay reintento destructivo automático.

Los paths retirados son irreutilizables: el registro privado conserva bucket/ruta/fecha, no los bytes. Los cambios de metadatos heredan auditoría editorial y motivo. El borrado físico no es transaccional con PostgreSQL; un fallo puede dejar objetos retirados pendientes de limpieza. Las subidas con respuesta incierta anterior a conocer el resultado pueden requerir revisión manual; no se promete cero huérfanos ante cualquier desconexión.

## Protección del servidor

Migración20261119144321_draft_asset_revision aplicada, novena remota y once archivos locales. Solo webhook y cuota Stripe siguen pendientes. Tipos remotos regenerados y usados directamente por el SDK, sin contratos locales alternativos. No reaplicar esta migración.

- RPC change_draft_asset SECURITY INVOKER exige administrador+aal2, motivo, timestamp y estado permitido; bloquea padre/hijo y registra el retiro del path anterior en la misma transacción. Solo archivos de hijos borrador; versiones publicadas/archivadas o con fecha de publicación y las imágenes actualmente publicadas se rechazan. No basta con ocultar categoría o padre. No elimina la versión.
- Trigger impide cambios de ruta/eliminación de filas protegidas y volver a asociar un path retirado, incluso con acceso directo a metadatos. Retiro y asociación se serializan por padre; escrituras directas que toman bloqueos en distinto orden pueden abortar por conflicto/deadlock y deben recargarse, sin reintento automático.
- Políticas restrictivas de Storage complementan las anteriores: UPDATE no modifica ni mueve objetos referenciados; DELETE exige retiro y ausencia de referencias; INSERT no reutiliza paths retirados. Conservan exigencia admin+aal2 y buckets privados. No se introducen claves privilegiadas en la web.
- Excepción acotada: objetos diagnósticos no referenciados _verification/32hex/(probe.png|probe.zip|invalid.txt|oversized.png|oversized.zip) pueden limpiarse con permisos administrativos. Nunca son paths canónicos asociables a catálogo. El diagnóstico de publicación ahora oculta y devuelve SOLO sus fixtures generados a borrador, borra hijos para retirar rutas y finalmente llama Storage.remove; no ejecutado remotamente en esta sesión.

draft_asset_status permite detectar contrato habilitado y enumerar retirados que aún existan en Storage. Si falta RPC o sesión, subidas/reemplazos/eliminaciones quedan desactivados antes de enviar blobs. El contrato ya está instalado en Supabase, pero la nueva UI solo se ha compilado/revisado localmente; no hay despliegue web ni prueba HTTP con sesión real todavía.

## Evidencia y pendientes

Check:16 API,24 SQL contando contenedor,77 Angular y1 SSR compilada; siete prerender,320,81kB/89,00kB estimados. SQL PGlite ejecuta migraciones reales con infraestructura Supabase representada: paths nuevos/retirados, concurrencia optimista, permisos, objetos referenciados, reemplazo/eliminación, versión conservada y auditoría. No es prueba multiproceso ni de blobs remotos.

SDK real con transporte HTTP controlado verifica subida sin upsert, asociación antes de eliminar, reconciliación, conflicto, respuesta incierta, limpieza pendiente y parada antes de subir sin RPC. Componente verifica revisión/motivo/casilla, guardado frente a limpieza y bloqueo por incertidumbre. API pública valida UUIDs/extensiones/ruta propia, conservando paths planos. Imágenes y descargas SSR anteriores siguen pasando.

CUA de componentes reales con fixtures locales sin Supabase: revisión/cancelación ZIP, foco y motivo sin casilla mantienen Confirmar desactivado; sin overflow320/390px. Capturas fase7-archivos-reemplazo-preview-escritorio.jpg y fase7-archivos-eliminacion-preview-movil.jpg. No se pulsó confirmación destructiva ni se cargaron ficheros reales. Preview no guarda cambios.

Migración y tipos remotos verificados; RPC invoker y tres políticas restrictivas confirmados. Prueba SQL remota con claims simulados y ROLLBACK completo comprobó retiro de ZIP, ruta retirada rechazada, imagen publicada protegida y aal1 denegado, sin crear blobs. No equivale a login/MFA HTTP. Consulta final: Rumbo draft/no aprobado1, otros addons0, objetos0 y retiros0. Asesor conserva solo aviso conocido de protección de contraseñas filtradas desactivada. Pendiente Storage HTTP con sesión real, fallo de red/limpieza y diagnóstico actualizado. No borrar filas storage.objects por SQL para simular eliminación de bytes. Enlaces firmados previos y bytes ya descargados no se revocan retroactivamente. Sin despliegue ni cambios al addon Lua.

Referencias oficiales: [control de acceso Storage](https://supabase.com/docs/guides/storage/security/access-control), [eliminación mediante Storage API](https://supabase.com/docs/guides/storage/management/delete-objects).
