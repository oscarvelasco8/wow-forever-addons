# Fase 1: entorno local

Fecha: 18 de noviembre de 2026. Plataforma: Windows x64 y PowerShell.

## Herramientas

- Node.js: 24.22.3 LTS, fijado en `.node-version` y `.nvmrc`.
- npm: 11.19.1, incluido en la distribución instalada de Node.
- VS Code: 1.137.0, ya instalado.
- Git: MinGit 2.56.0.windows.4, distribución oficial de Git for Windows para línea de comandos, independiente del runtime de Codex.
- Angular: CLI 22.2.7 instalada localmente en la fase 2. Dependencias exactas en `package-lock.json`; no requiere CLI global.

Node se ha instalado para el usuario en:

```text
C:\Users\Oscar\AppData\Local\Programs\NodeJS\node-v24.22.3-win-x64
```

El directorio se ha añadido al PATH del usuario. Cierra y vuelve a abrir las terminales; las aplicaciones ya abiertas, incluido VS Code o Codex, pueden necesitar reiniciarse para heredar el PATH.

MinGit está instalado en `C:\Users\Oscar\AppData\Local\Programs\MinGit\2.56.0.4`, con su carpeta `cmd` en el PATH del usuario. No incluye Git Bash ni interfaz gráfica, que no son necesarios para el proyecto. El intento previo con el instalador de Git no finalizó y se detuvo antes de usar MinGit.

El ZIP de MinGit procede de la publicación oficial `git-for-windows/git`, etiqueta `v2.56.0.windows.4`. Su SHA-256 se verificó contra el digest publicado en GitHub:

```text
e3bf78351fe777fba47ddee5950082f8a98bb0f02604fdc7ba3ee2cb68ffa877
```

El ZIP oficial se descargó de `https://nodejs.org/dist/v24.22.3/node-v24.22.3-win-x64.zip` y su SHA-256 se comparó con el manifiesto oficial:

```text
e612af99f626ab415ea225af6bce5c971feb448cb5cae250bb1c3fa50c5f7d9f
```

## Comprobación reproducible

Desde la carpeta del proyecto:

```powershell
git --version
node --version
npm.cmd --version
code --version
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-environment.ps1
npm.cmd ping
git ls-remote origin HEAD
```

`npm.cmd` evita que PowerShell seleccione el lanzador `npm.ps1`. El comando de comprobación aplica la política de ejecución solo al proceso iniciado, sin cambiar la configuración del sistema.

## Repositorios

- Web vigente desde 21/11/2026: `https://github.com/devel8ping-code/wow-forever-addons.git`.
- Addon de referencia: `oscarvelasco8/addon-rumbo`, privado y accesible mediante la integración de GitHub.

La web ya estaba clonada en `main`, con un único commit inicial y README. No se ha vuelto a clonar ni se ha mezclado el código Lua con la aplicación web.

El acceso de la integración de GitHub no autentica automáticamente Git en una terminal. `git ls-remote` del repositorio web público verifica conectividad de lectura, no permisos para publicar cambios. La autenticación local para hacer push se comprobará antes del primer envío, sin guardar tokens en archivos.

La identidad de commits inicial, con `oscarvelasco8`, pertenece al período anterior a la transferencia. La cuenta vigente del repositorio web es `devel8ping-code`; no se debe trasladar la configuración antigua a otros repositorios ni cambiar la identidad global. Se configuraron `core.autocrlf=false` y `core.safecrlf=warn` localmente; la base del proyecto definirá finales de línea mediante `.gitattributes`.

## Resultado de la fase

- Comprobación ejecutada con un PATH reconstruido desde las variables de usuario y sistema, sin depender del runtime de Codex: correcta.
- Registro npm: `npm.cmd ping` correcto.
- Angular CLI 22.2.7 disponible en el registro.
- Lectura de `origin`: HEAD `48c41e5c58b0bea14a62ceab0c71986a6437cde3`.
- Exclusión de `.env`, `.env.local`, dependencias, compilación y referencias: comprobada.
- Acceso al proyecto web mediante la integración GitHub: confirmado.
- No se ha realizado ningún commit ni push.

No se requieren todavía Angular CLI global, Docker, Supabase CLI, Vercel CLI ni Stripe CLI. Se incorporarán solo cuando su fase lo necesite.

## Fuentes

- Compatibilidad de Angular: https://angular.dev/reference/versions
- Distribuciones oficiales de Node: https://nodejs.org/dist/
- Git para Windows: https://git-scm.com/install/windows
