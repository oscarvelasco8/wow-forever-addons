# Revisión de dependencias

Fecha: 18 de noviembre de 2026.

Actualización posterior, fase 4A: añadida `@electric-sql/pglite` 0.5.16 como dependencia exclusiva de desarrollo para ejecutar migraciones y políticas con PostgreSQL en memoria. La auditoría completa volvió a ejecutarse y ahora devuelve cero vulnerabilidades; el aviso retirado de picomatch ya no aparece. El análisis inicial inferior se conserva como historial, no como estado actual.

- Angular CLI estable consultada en npm: 22.2.7.
- La instalación está fijada de forma reproducible por `package-lock.json`; usar `npm ci`.
- `npm audit --omit=dev`: 0 vulnerabilidades detectadas durante la preparación.
- Auditoría completa inicial: 12 resultados de severidad alta, todos derivados del aviso de picomatch `GHSA-fc5q-39xc-vjpf` sobre dependencias de desarrollo (CLI, build, Vite, Vitest y transitivas).
- picomatch instalado: 4.0.7, también la última versión estable consultada en npm.
- GitHub marca ese aviso como retirado el 18 de noviembre de 2026. El registro npm todavía lo devolvía en el momento de la comprobación.
- No se ejecutó `npm audit fix --force`: proponía degradar Angular CLI a 16.2.0 y no resolvía coherentemente la base actual.
- No se han silenciado auditorías ni introducido overrides. Revisar nuevamente en futuras actualizaciones y antes de producción.

Referencia: https://github.com/advisories/GHSA-fc5q-39xc-vjpf

Los análisis de dependencias no sustituyen las pruebas de permisos y seguridad de la aplicación, previstas en las fases de Supabase, administración y aportaciones.
