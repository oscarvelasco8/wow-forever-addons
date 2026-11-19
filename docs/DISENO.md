# Fase 3: identidad visual y páginas públicas

## Errores y navegación accesible19/11

Vistas404 con acceso al catálogo y al inicio, mensaje de ficha no disponible y503 diferenciado. Foco en contenido al navegar, skip-link probado y movimiento reducido en CSS. Capturas fase8-ficha-no-disponible-escritorio.jpg y fase8-error404-movil.jpg del paquete compilado real local;320/390px sin overflow, sin errores de consola observados. No son despliegue ni auditoría WCAG completa.


## Categorías — revisión19/11

Listado con estado/orden y editor de nombre/identificador/orden/visibilidad. Revisión antes de guardar con aviso de efecto sobre addons publicados. Capturas fase7-categorias-preview-{escritorio,movil,confirmacion}.jpg con fixtures locales identificados. Sin overflow320/390px, foco de revisión correcto.


## Galería pública — revisión19/11

Integrada en la ficha, imagen principal sobre fondo oscuro, miniaturas con selección dorada, contador, controles nativos y alt/pie. Vista de carga/error con reintento y navegación disponible tras fallo. QA a320/390px sin overflow, selección con teclado verificada. Capturas fase5-galeria-preview-{escritorio,movil,error}.jpg, componente real con datos/ilustraciones de ejemplo claramente señalados. No son capturas del juego.


## Revisión editorial — capturas locales19/11

Vista previa aislada con componentes reales y datos ficticios. Capturas fase7-editorial-preview-{completa,ficha,confirmacion,confirmacion-movil}.jpg. Móvil320/390px sin desbordamiento. Corregido foco del formulario con afterNextRender y comprobado visualmente. Sin autenticación ni publicación real en esta vista.


Actualización de marca: la plataforma se llama provisionalmente WoW Forever Addons. Rumbo es el primer producto. El mapa conceptual pertenece a su presentación en catálogo y ficha; la portada usa una vista de la colección derivada de ADDONS. La página de apoyo se refiere a la plataforma. Capturas actuales con prefijo `plataforma-`; las anteriores documentan el primer diseño.

## Dirección

Cuaderno de exploración: carbón, verde bosque, dorado envejecido, serif editorial y líneas cartográficas. Evitar personajes, logotipos o texturas oficiales sin permiso. El mapa SVG y la brújula de la cabecera son gráficos originales hechos para esta web, no representaciones geográficas verificadas ni capturas del addon.

Los tokens están en `src/styles/_tokens.scss`; estilos de controles y composición comunes en `src/styles.scss`. La tipografía utiliza fuentes del sistema, sin llamadas a proveedores externos.

## Componentes y páginas

- Layout común con navegación activa, pie y salto al contenido que conserva la ruta actual.
- `shared/ui/route-map`: mapa conceptual reutilizado en inicio, catálogo y ficha.
- `shared/ui/status-badge`: estado gratuito reutilizado.
- `/`: presentación, addon destacado, principios y explicación del apoyo voluntario.
- `/catalogo`: buscador por palabras con normalización de tildes, categoría, contador anunciado y estado vacío con limpieza de filtros.
- `/addons/rumbo`: datos declarados de Rumbo, funcionalidades, instalación y créditos; no se ofrece ZIP hasta preparar la publicación.
- `/apoyar`: explicación del apoyo voluntario, sin procesar pagos todavía.

Modelo tipado y metadatos locales en `core/catalog/addon.ts`, con Rumbo como único addon real. No se han inventado productos, valoraciones, número de descargas ni publicaciones.

Las cuatro rutas se prerenderizan. Los filtros son locales y no se conservan todavía en la URL. Supabase se incorporará en la fase 4 y el catálogo conectado en la fase 5.

## Comprobaciones

- `npm.cmd run check`: tipos API, una prueba HTTP, tres pruebas Angular y build correctos.
- Compilación: cuatro rutas prerenderizadas, 274,44 kB iniciales y 76,03 kB de transferencia estimada. Sin avisos de presupuesto de estilos en la ejecución final.
- Navegador: navegación entre páginas, búsqueda sin resultados y recuperación con Limpiar filtros.
- Enlace de instalación conserva `/addons/rumbo` y añade el fragmento correcto.
- Activación con Enter del enlace Saltar al contenido: foco en `main#contenido` sin salir de la ficha.
- Revisiones a 1440 × 1000 y 390 × 844, más medición de anchura a 320 × 780 en las cuatro páginas: sin desbordamiento horizontal tras las correcciones.
- Consola capturada en la revisión final: sin errores.
- Respeto de movimiento reducido y foco visible incluidos; no equivalen a una auditoría completa de accesibilidad ni a prueba con lector de pantalla.
- Capturas reales de las cuatro páginas en `docs/capturas/fase3-*.jpg`.

## Integración pública posterior

Inicio/preview/catálogo/ficha ya usan publicaciones reales de Supabase; Rumbo borrador no aparece. Se muestran carga, error/reintento, catálogo vacío y ficha no disponible en lugar de datos locales. Categorías y enlaces son dinámicos. Capturas actuales fase5-{inicio,catalogo,ficha-borrador}-{escritorio,movil}.jpg; esas tres vistas sin overflow a320px. El mapa conceptual se reserva a Rumbo publicado; otros productos usan símbolo neutro. Descripción/changelog/créditos como texto plano. Galería e instrucciones editoriales pendientes; no reutilizar instrucciones específicas de Rumbo para otros addons.

## Pendientes

Supabase, panel administrativo, archivos, Stripe y despliegue. Capturas reales del addon dentro del juego y armonización de créditos antes de su distribución. No hay transacciones ni descargas implementadas en esta fase.
