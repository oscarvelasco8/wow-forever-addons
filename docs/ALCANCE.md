# WoW Forever Addons (nombre provisional)

## Decisión vigente

La web reúne todos los addons que se creen para el proyecto. Rumbo es el primer addon del catálogo, no la marca de la plataforma. Cada addon tendrá su ficha, versiones, imágenes y archivos independientes.

Los addons se distribuyen gratuitamente, con todas sus funciones y actualizaciones. La web admite aportaciones voluntarias, sin desbloqueos, acceso preferente ni obligación de registrarse para descargar. En la primera versión, la página de apoyo se refiere al mantenimiento general de la plataforma.

Las aportaciones se describirán como apoyo voluntario al desarrollo. No se prometerá desgravación fiscal ni condición benéfica. No se incluirán solicitudes dentro del juego.

## Primera versión

- Catálogo público preparado para varios addons, con Rumbo como primera publicación.
- Ficha, versiones, compatibilidad, changelog, créditos e instrucciones.
- Descargas públicas y archivos publicados bajo control administrativo.
- Aportaciones voluntarias mediante enlace externo PayPal.Me, sin permisos de compra asociados al addon. Stripe se conserva como integración histórica de pruebas, sin modo real activado.
- Supabase PostgreSQL, Storage y autenticación de administradores con RLS.
- Angular y API Node.js compatibles con Vercel.
- Diseño oscuro con acentos dorados, accesible y responsive; recursos propios o con licencia.

No forman parte del lanzamiento las cuentas de compradores, biblioteca de compras, licencias premium ni archivos del addon restringidos por pago. Los datos personales de las aportaciones no serán públicos.

## Orden de trabajo y validación

1. Entorno: Git, Node, npm, editor y acceso de lectura comprobados.
2. Base: Angular, API mínima, configuración y compilación correctas.
3. Diseño: componentes y navegación revisados en móvil, escritorio y teclado.
4. Supabase: migraciones, RLS, almacenamiento y acceso administrativo verificados.
5. Catálogo y descargas: versiones publicadas disponibles y borradores protegidos.
6. Aportaciones: Stripe en pruebas, firma de webhook e idempotencia verificadas.
7. Administración: publicación, retirada de versiones y auditoría.
8. Calidad: permisos, accesibilidad, SEO, rendimiento y flujos críticos.
9. Producción: variables independientes, dominio, correo, observabilidad y reversión.
10. Operación: restauración de copias, revisión de dependencias y costes.

Cada fase tendrá evidencia de comprobación antes de continuar. La elección del plan de hosting se confirmará con sus condiciones vigentes antes del despliegue.
