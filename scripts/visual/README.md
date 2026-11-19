# Capturas de revisión editorial

## Informe de pruebas Stripe reales sandbox

`node scripts/visual/serve.mjs stripe-report` desde raíz sirve solo docs/capturas/fase6-stripe-validacion.html en loopback4201, con datos resumidos corroborados por APIs. No consulta ni muestra claves, payloads o clientes. Captura fase6-stripe-rechazo-3ds-informe.jpg obtenida en Chrome, distinta de los fixtures de componentes. No es Dashboard Stripe. Detener auxiliar tras capturar; conservar API y listener para pruebas.

## Revisión de archivos

Desde scripts/visual compilar `node ../../node_modules/@angular/cli/bin/ng.js build --configuration assets`; desde raíz `node scripts/visual/serve.mjs assets`. Abrir http://127.0.0.1:4201/administracion/addons/11111111-1111-4111-8111-111111111111/archivos. Componente real con ZIP/imagen ficticios y contrato simulado disponible. No guarda ni elimina; sin conexión Supabase/CSP connect-src none. Revisar y cancelar, sin confirmación destructiva. Capturas fase7-archivos-{reemplazo-preview-escritorio,eliminacion-preview-movil}.jpg. Detener auxiliar al finalizar.

## Preview de espera por cuota

Compilar configuración support desde scripts/visual. Desde raíz `node scripts/visual/serve.mjs support-limit` muestra componente real en http://127.0.0.1:4201/apoyar con GET ficticio activo y POST429/Retry-After60. Sin Stripe/Supabase; permite ver cuenta atrás y botón/importes desactivados. No prueba cuota remota. Capturas fase6-limite-checkout-preview-{escritorio,movil}.jpg. Detener auxiliar al terminar.

## Informe del webhook local

Desde raíz `npm.cmd run verify:webhook:local` ejecuta assertions y genera docs/capturas/fase6-webhook-informe-local.html solo si pasan. `node scripts/visual/serve.mjs webhook-report` sirve únicamente ese informe en http://127.0.0.1:4201/ para capturas. No es una página de producto ni un panel conectado. PostgreSQL persistente PGlite y eventos firmados ficticios, RPC simulado; ninguna conexión Stripe/Supabase remota. Capturas fase6-webhook-informe-{escritorio,movil}.jpg. Detener auxiliar al terminar.

## Preview de aportaciones

Compilar desde scripts/visual con `node ../../node_modules/@angular/cli/bin/ng.js build --configuration support`; servir desde raíz con `node scripts/visual/serve.mjs support`. Abrir http://127.0.0.1:4201/apoyar. Componente real con disponibilidad test ficticia y POST503 para revisar error/reintento. Ninguna conexión con Stripe o Supabase, sin claves ni pagos. CSP connect-src self. Capturas fase6-checkout-preview-*.jpg. Detener servidor auxiliar al terminar.

## Preview de paginación e imágenes

Desde scripts/visual ejecutar `node ../../node_modules/@angular/cli/bin/ng.js build --configuration pagination`; desde raíz `node scripts/visual/serve.mjs pagination`. Abrir http://127.0.0.1:4201/catalogo. Usa componentes y stores reales con26 addons ficticios y API local; CSP permite solo conexiones al mismo origen, ninguna conexión Supabase. Imágenes ilustradas propias convertidas con el optimizador WebP real. Permite revisar12→24→26, búsquedas, categorías y ficha. No valida publicación HTTP autenticada real. Capturas fase8-paginacion-preview-*.jpg. Detener solo este servidor auxiliar al terminar.

Vista previa aislada de los componentes reales App y Editorial con un gateway de solo lectura y datos ficticios. No inicia sesión, no obtiene credenciales y no se conecta con Supabase. La política CSP bloquea las conexiones de red y el servidor solo escucha en loopback. No hay ruta de demostración en la aplicación principal ni se incluye este punto de entrada en su compilación.

Desde esta carpeta:

```powershell
node ../../node_modules/@angular/cli/bin/ng.js build
```

Desde la raíz del proyecto:

```powershell
node scripts/visual/serve.mjs
```

Abrir http://127.0.0.1:4201. El estado inicial es un borrador ficticio; añadir `?estado=publicado` a la ruta editorial para revisar sus controles de retirada. Las confirmaciones no guardan cambios. El componente real y sus formularios permiten comprobar el diseño y el foco; esto no valida autenticación, RLS ni operaciones HTTP reales.

Capturas en docs/capturas/fase7-editorial-preview-*.jpg. Las vistas llevan una advertencia visible. Detener el servidor auxiliar al finalizar las capturas. Mantener intactos los servidores de la aplicación principal.

## Galería pública

Desde scripts/visual: `node ../../node_modules/@angular/cli/bin/ng.js build --configuration gallery`. Desde la raíz: `node scripts/visual/serve.mjs gallery`. La ficha /addons/addon-de-ejemplo usa PublicCatalog ficticio y tres ilustraciones SVG originales servidas localmente; no son formatos de subida autorizados ni capturas reales de Rumbo. Añadir ?error para probar un404 en la tercera imagen. CSP sigue bloqueando conexiones externas. Capturas fase5-galeria-preview-*.jpg.

## Categorías

Compilar desde scripts/visual con `node ../../node_modules/@angular/cli/bin/ng.js build --configuration categories`. Servir desde raíz con `node scripts/visual/serve.mjs categories`. Ruta /administracion/categorias, componentes reales con tres categorías ficticias, sin Auth/Supabase y sin guardado. Capturas fase7-categorias-preview-*.jpg.
