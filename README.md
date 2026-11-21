> Estado vigente 21/11/2026: cuenta Stripe cerrada por el titular. Integración retirada, endpoints antiguos responden 410. Apoyo público solo mediante PayPal.Me externo; las notas de Stripe siguientes son históricas.

# WoW Forever Addons

Plataforma de distribución gratuita de addons para WoW Forever y apoyo voluntario al proyecto. Rumbo es el primer addon del catálogo.

Estado: Angular y API Node.js, catálogo público conectado a Supabase, fichas SSR con galería de imágenes publicadas y descarga gratuita con RLS y enlaces de 60 segundos. Panel con MFA, edición de borradores, creación de versiones, subidas privadas de ZIP/imágenes y previsualización, comprobados localmente con datos de prueba. Rumbo sigue en borrador sin distribuir. Recuperación de contraseña sin resolver y aplazada; revisión editorial y auditoría implementadas, pendientes de QA visual/HTTP con sesión del propietario. Gestión completa de archivos, aportaciones y despliegue pendientes.

- [Preparación y comprobaciones del entorno](docs/ENTORNO.md)
- [Alcance y fases de desarrollo](docs/ALCANCE.md)
- [Arquitectura y ejecución local](docs/ARQUITECTURA.md)
- [Memoria para continuar en otro chat](docs/MEMORIA.md)
- [Registro de trabajo](docs/REGISTRO.md)
- [Diseño y comprobaciones visuales](docs/DISENO.md)
- [Calidad, accesibilidad y SEO](docs/CALIDAD.md)
- [Supabase: esquema, permisos y validación pendiente](docs/SUPABASE.md)
- [Acceso administrativo: preparación y límites](docs/ADMINISTRACION.md)

## Arrancar el proyecto

```powershell
npm.cmd ci
npm.cmd start
```

En otra terminal, `npm.cmd run start:api`. Desarrollo carga `.env` para SSR; las fichas requieren URL/clave pública de Supabase. La web escucha en `http://127.0.0.1:4200/` y la API en `http://127.0.0.1:3001/api/health`.

## Validar

```powershell
npm.cmd run check
```

## Comprobar el entorno

En PowerShell, desde esta carpeta:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-environment.ps1
```

Requiere Node 24.22.3, npm y Git disponibles en el PATH. Tras instalar las herramientas, abre una terminal nueva.
# Rendimiento local actualizado — 19/11

Catálogo paginado de12 con búsqueda remota y categorías, fichas individuales SSR y variantes WebP320/640/1280. Octava migración aplicada; validación11 API,21 SQL,69 Angular y1 SSR. Capturas con datos ficticios y límites pendientes en docs/MEMORIA.md y docs/CALIDAD.md. Sin despliegue; recuperación de contraseña aplazada.

## Aportaciones: preparación de pruebas

Sandbox ya conectado: propietario completó pago sencillo y3DS; rechazo no generó pago y reentregas no duplican. Dos pagos ficticios5€ confirmados mediante webhook/Supabase. Doce migraciones alineadas y check17 API/24 SQL/77 Angular/1 SSR. Web local sin despliegue/cobros reales; retorno informado por backend y recuperación listener pendientes. Detalles actuales en docs/APORTACIONES.md.

## Gestión de archivos preparada localmente

Reemplazo/eliminación de ZIP e imágenes con revisión y limpieza pendiente recuperable. Protección SQL/Storage aplicada selectivamente: nueve migraciones remotas/once archivos locales, solo dos Stripe pendientes. Validación16 API,24 SQL,77 Angular y1 SSR, más SQL remoto revertido sin blobs. Nueva prueba HTTP administrativa pendiente. Ver [gestión de archivos](docs/ARCHIVOS.md). Sin eliminación real o despliegue web.

Control de uso preparado localmente: cuota compartida6/minuto y30/hora,429 con espera y503 sin Stripe si falla protección. Estado actual15 API,23 SQL,72 Angular y1 SSR. Ocho migraciones remotas/diez archivos locales, dos pendientes. Pagos desactivados, cuenta Stripe todavía pendiente. Ver [aportaciones y operación](docs/APORTACIONES.md).

Webhook y registro privado probados localmente: firma, duplicados, orden de entrega, rollback y persistencia tras reapertura. Validación actual14 API,22 SQL,71 Angular y1 SSR; integración local con `npm run verify:webhook:local`. Nueva migración pendiente de aplicar, Stripe aún sin cuenta y ambos endpoints desactivados por defecto. Ver [docs/APORTACIONES.md](docs/APORTACIONES.md).

Checkout de pruebas implementado y desactivado por defecto. Sin cobros ni conexión real Stripe; webhook persistente y sandbox integral pendientes. Validación actual12 API,21 SQL,71 Angular y1 SSR. Configuración y evidencia en [docs/APORTACIONES.md](docs/APORTACIONES.md).

Retorno Stripe sandbox: confirma solo el registro del webhook mediante recibo temporal privado. Operación y recuperación manual local documentadas en docs/APORTACIONES.md. Sin modo live ni despliegue.

Preparación de publicación: docs/PRODUCCION.md; comprobar el build con npm run check:release. No despliega ni activa aportaciones.
