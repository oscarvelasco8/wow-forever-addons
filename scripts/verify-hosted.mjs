// Read-only smoke check: no auth, cookies, POST requests, keys or response bodies.
const origin=new URL(process.argv[2]??'');
if(process.argv.length>3)throw Error('Specify only the HTTPS origin');
if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('Specify an HTTPS origin');
const cases=[['/',200],['/catalogo',200],['/apoyar',200],['/administracion/acceso',200],['/administracion/recuperar',200],['/administracion/categorias',200],['/addons/rumbo',200],['/no-existe',404],['/api/health',200],['/api/public-config',200],['/api/catalog',200],['/api/support-checkout',410],['/api/support-status',410],['/api/support-webhook',410],['/api/download',404],['/api/image',404],['/sitemap.xml',503],['/robots.txt',200]];
let failed=0;
for(const [path,expected] of cases){
 try{
  const response=await fetch(new URL(path,origin),{redirect:'manual',signal:AbortSignal.timeout(15000)});
  const body=await response.text();let ok=response.status===expected;
  if(path==='/addons/rumbo'&&ok)ok=/<title>[^<]*Rumbo/i.test(body);
  if(path==='/api/public-config'&&ok){const data=JSON.parse(body);ok=Object.keys(data).sort().join(',')==='publishableKey,url';}
  if(path.startsWith('/administracion/')&&ok)ok=response.headers.get('cache-control')?.includes('no-store')&&response.headers.get('x-robots-tag')?.includes('noindex');
  console.log(JSON.stringify({path,expected,status:response.status,ok}));if(!ok)failed++;
 }catch{console.log(JSON.stringify({path,expected,ok:false,error:'request_failed'}));failed++;}
}
console.log(JSON.stringify({scope:'Public read-only checks; published Rumbo and unset canonical domain expected',failed}));if(failed)process.exitCode=1;
