# Calidad y SEO — 19 de noviembre de 2026

## Rendimiento y evidencia actualizada

Check final:11 API,21 SQL contando contenedor,69 Angular y1 integración SSR compilada; siete prerender y bundle inicial320,41kB/89,00kB estimados. Cobertura de cursor/filtros, búsqueda literal y acentos, ocultación por RLS, respuestas tardías, error al ampliar, ficha individual y snapshot; imágenes con Sharp nativo, dimensiones, orientación, metadatos, formato y límites. Una imagen sintética comprime mucho, pero no representa ahorro garantizado en contenido real.

Prueba SQL remota con18 productos técnicos y rol anon revertida completamente; HTTP real /api/catalog200 vacío y /api/addon?slug=rumbo404. No hay publicación ni imagen real positiva nueva. Vista aislada de26 ejemplos:12→24→26, búsqueda de26 devuelve1, categorías conservadas. Sin overflow320/390px. Capturas fase8-paginacion-preview-{escritorio,movil}.jpg; no son catálogo remoto. Originales intactos, variantes no-store; límites y arquitectura documentados en ARQUITECTURA.md. Quedan medir carga real e imágenes auténticas, revisar flujos administrativos con sesión del propietario y probar empaquetado Sharp/SSR en Vercel.

Este bloque está comprobado localmente. No constituye un despliegue ni una certificación completa de accesibilidad.

## Renderizado y errores

Las fichas `/addons/:slug` usan SSR de Angular. Su HTML inicial contiene la ficha pública y el estado transferido necesario para hidratar sin volver a mostrar una pantalla de carga. Las consultas siempre usan la clave publishable y RLS anónima; no se reenvían cabeceras, cookies ni JWT del visitante. Inicio, catálogo, apoyo y accesos estáticos siguen prerenderizados; el panel sigue CSR.

- Publicación disponible: HTTP200 y contenido inicial completo.
- Borrador, retirada o inexistente: HTTP404, mensaje público y noindex.
- Proveedor no disponible: HTTP503 con reintento; no se confunde con una ficha inexistente.
- Ruta desconocida: documento `404.html` generado durante build para alojamiento estático y adaptador local.

La función `/api/render` solo admite identificadores de addon válidos. Construye una petición interna de ruta fija sin copiar datos del solicitante. El motor usa un host interno permitido; las URL canónicas no dependen de Host/X-Forwarded-Host.

El rewrite y la inclusión de bundles SSR en Vercel están preparados, pero requieren comprobación real antes de desplegar. La configuración anterior que solo subía HTML/JS estáticos ya no basta para las fichas: necesitan la función Node de renderizado.

## Metadatos y descubrimiento

Título, descripción y etiquetas Open Graph cambian por página; los datos de una ficha anterior se eliminan al navegar. Las páginas de error y administración son noindex. Los cambios de fragmento (por ejemplo, saltar al contenido) conservan los metadatos de la página.

Configurar `PUBLIC_SITE_URL` con el origen HTTPS definitivo, tanto en build como en runtime. No se ha elegido un dominio. Sin esta variable no se inventa una URL canónica y las páginas quedan noindex. Nunca obtenerla de una cabecera del visitante.

`/sitemap.xml` consulta publicaciones anónimas y añade las páginas públicas estáticas. Si falta dominio/configuración o falla Supabase devuelve503, sin publicar un mapa falso o vacío. `robots.txt` excluye administración y API, permite imágenes públicas y añade la URL absoluta del sitemap cuando el dominio está configurado durante build. Robots no sustituye a los permisos.

## Accesibilidad revisada

- Un h1 y un main en las vistas públicas inspeccionadas; etiquetas de búsqueda y categoría asociadas a sus controles.
- Enlace para saltar al contenido y foco en main después de navegar; no se interfiere con enlaces a fragmentos.
- Estados de error con salida al catálogo y al inicio; errores de galería con reintento y controles accesibles ya verificados.
- Botones deshabilitados diferenciados y respeto a `prefers-reduced-motion` en CSS.
- Colores principales contra fondo base: texto15,29:1; secundario8,56:1; enlaces8,91:1. Es una muestra, no auditoría de todas las combinaciones/estados.
- Estados públicos de error sin overflow a320px (305=305) y390px (375=375). Sin errores de consola/hidratación observados en esos recorridos.

Faltan una revisión completa con lector de pantalla, zoom y todos los estados autenticados, además del entorno de producción.

## Evidencia y comandos

`npm.cmd run check` pasa8 API,20 SQL contando contenedor,66 Angular y1 integración SSR del paquete compilado. Genera siete rutas prerenderizadas y bundles de navegador/servidor. Inicial319,44kB/88,70kB estimados, dentro del presupuesto de500kB.

La integración SSR usa un proveedor HTTP local controlado: comprueba HTML publicado, metadatos seguros, aislamiento entre peticiones, 404 tras retirada y503. No publica datos remotos. La prueba real de solo lectura contra Supabase mantiene Rumbo en borrador y responde404 con HTML completo.

```powershell
npm.cmd run build
npm.cmd run start:built
# http://127.0.0.1:4202
```

El adaptador sirve assets, API y SSR para revisar el paquete real. Solo escucha en loopback. `npm.cmd start` ahora carga `.env` también para SSR de desarrollo; `start:api` mantiene el servicio en3001.

Capturas reales del build local:

- [Ficha no disponible, escritorio](capturas/fase8-ficha-no-disponible-escritorio.jpg).
- [Error404, móvil](capturas/fase8-error404-movil.jpg).

No son capturas de un despliegue. Las pruebas de publicaciones reales y gestión autenticada siguen pendientes del propietario. No se ha modificado Rumbo ni el addon Lua. Permanecen pendientes recuperación, optimización de imágenes, paginación antes de crecer, aportaciones, dominio y validación de Vercel.
