import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('Vercel checks files before returning the branded HTTP 404 and preserves administrative and SSR routes',async()=>{
 const c=JSON.parse(await readFile('vercel.json','utf8'));
 assert.equal(c.rewrites,undefined);assert.equal(c.headers,undefined);
 const files=c.routes.findIndex(r=>r.handle==='filesystem');assert.ok(files>0);
 assert.deepEqual(c.routes.at(-1),{src:'/(.*)',dest:'/404.html',status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
 const route=path=>c.routes.slice(0,files).find(r=>r.dest&&new RegExp('^'+r.src+'$').test(path));
 for(const path of ['/administracion','/administracion/cuenta','/administracion/categorias','/administracion/addons/id','/administracion/addons/id/archivos','/administracion/addons/id/publicacion','/administracion/addons/id/preparar','/administracion/restablecer'])assert.equal(route(path)?.dest,'/index.csr.html');
 for(const path of ['/','/catalogo','/apoyar','/administracion/acceso','/administracion/recuperar','/administracion/denegado','/no-existe','/api/catalog','/main.js'])assert.equal(route(path),undefined);
 assert.equal(route('/addons/rumbo')?.dest,'/api/render?slug=$1');
 assert.equal(c.routes[1].headers['Cache-Control'],'no-store');
});
