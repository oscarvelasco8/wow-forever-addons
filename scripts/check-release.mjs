import {readFile,readdir,stat,writeFile} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
import {parseEnv} from 'node:util';

// Local artifact inspection only. Never prints matched content or environment values.
const root=resolve('dist/wow-forever-addons/browser');
const checks=[];
function check(name,ok){checks.push({name,ok});}
async function walk(dir){const result=[];for(const e of await readdir(dir,{withFileTypes:true})){if(e.isSymbolicLink())throw Error('Symlinks not allowed');const p=join(dir,e.name);if(e.isDirectory())result.push(...await walk(p));else result.push(p);}return result;}
try{
 const files=await walk(root);
 let env={};try{env=parseEnv(await readFile('.env','utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 const secrets=Object.entries(env).filter(([name,value])=>/SECRET|SERVICE_ROLE/.test(name)&&value.length>=16).map(([,value])=>value);
 let exposed=false,fixture=false,sourcemaps=false;
 for(const file of files){
  const name=relative(root,file);
  if(/(^|[\\/])\.env(?:\.|$)/.test(name))exposed=true;
  if(name.endsWith('.map'))sourcemaps=true;
  if(!/\.(?:js|json|html|css|txt|map)$/i.test(name))continue;
  const body=await readFile(file,'utf8');
  if(secrets.some(value=>body.includes(value))||/\b(?:sk_(?:test|live)|sb_secret|whsec)_[A-Za-z0-9]{16,}/.test(body))exposed=true;
  if(/VISTA PREVIA LOCAL · DATOS DE EJEMPLO|fixture\.proof|cs_test_receipt_preview/.test(body))fixture=true;
 }
 check('Paquete público sin claves privadas detectadas ni archivos .env',!exposed);
 check('Paquete público sin datos de las vistas de ejemplo',!fixture);
 check('Paquete público sin mapas de código fuente',!sourcemaps);
 for(const page of ['index.html','catalogo/index.html','apoyar/index.html','administracion/acceso/index.html','administracion/recuperar/index.html','index.csr.html','404.html']){
  let found=false;try{found=(await stat(join(root,page))).isFile();}catch{}
  check('Documento generado: '+page,found);
 }
 const robots=await readFile(join(root,'robots.txt'),'utf8');
 check('Robots excluye administración y API',robots.includes('Disallow: /administracion')&&robots.includes('Disallow: /api/'));
 const config=JSON.parse(await readFile('vercel.json','utf8'));
 check('SSR incluido en el paquete de la función Vercel',config.functions?.['api/render.ts']?.includeFiles==='dist/wow-forever-addons/{server,browser}/**');
 check('Rewrite de fichas hacia SSR',config.rewrites.some(r=>r.source==='/addons/:slug'&&r.destination==='/api/render?slug=:slug'));
 const example=parseEnv(await readFile('.env.example','utf8'));
 check('Plantilla mantiene Checkout y webhook desactivados',example.STRIPE_TEST_CHECKOUT_ENABLED==='false'&&example.STRIPE_TEST_WEBHOOK_ENABLED==='false');
 const report={scope:'Inspección local del paquete; no autoriza producción ni verifica servicios alojados',checks};
 console.log(JSON.stringify(report,null,2));
 if(process.argv.includes('--report')){
  const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  await writeFile('docs/capturas/fase9-paquete-informe.html',`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Preparación del paquete · WoW Forever Addons</title><style>body{background:#121610;color:#eeeade;font:18px system-ui;max-width:1050px;margin:45px auto;padding:0 28px}small{color:#d0ba7f}h1{font:42px Georgia}li{padding:7px}footer{border-top:1px solid #625a40;margin-top:24px;padding-top:20px;color:#c5c8be}strong{color:#dfc686}</style><small>COMPROBACIONES LOCALES REALES · 19/11/2026 · SIN DESPLIEGUE</small><h1>Paquete revisado antes de publicar</h1><p>${checks.filter(c=>c.ok).length} de ${checks.length} comprobaciones aprobadas.</p><ul>${checks.map(c=>`<li>${c.ok?'✓':'✗'} ${escape(c.name)}</li>`).join('')}</ul><footer><strong>Pendiente:</strong> dominio, entorno Vercel y validación alojada, correo y recuperación de contraseña. Stripe continúa exclusivamente en pruebas.<p>Informe de inspección del paquete compilado; no es una captura de producción ni una sesión administrativa. No contiene secretos o datos personales.</p></footer></html>`);
 }
 if(checks.some(c=>!c.ok))process.exitCode=1;
}catch{console.error('No se pudo inspeccionar el paquete. Compila primero; no se muestran datos privados.');process.exitCode=1;}
