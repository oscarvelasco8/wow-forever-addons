import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { createCatalogHandler } from '../../api/catalog.ts';
import { createAddonHandler } from '../../api/addon.ts';
test('catalog cursor pages are bounded, preserve filters and keep full detail separate',async context=>{
  const rows=Array.from({length:25},(_,index)=>({slug:'addon-'+String(index+1).padStart(2,'0'),name:'Addon '+String(index+1).padStart(2,'0'),summary:'Resumen',description:'Descripción extensa solo para la ficha',installation_instructions:'Instalación',author_name:'Autor',license_name:'MIT',credits:'Créditos',status:'published',distribution_approved:true,published_at:'2000-01-01',categories:{name:'Herramientas',slug:'herramientas',sort_order:0,is_visible:true},addon_releases:[],addon_images:[]}));
  let calls=0;
  const transport:typeof fetch=async(input,init)=>{
    calls++;const url=new URL(String(input)),headers=new Headers(init?.headers);assert.equal(headers.get('authorization'),null);assert.equal(headers.get('cookie'),null);
    if(url.pathname.endsWith('/rpc/catalog_page')){assert.equal(url.searchParams.get('select'),'slug,name');const params=JSON.parse(String(init?.body));assert.equal(params.p_limit,13);return Response.json(rows.filter(row=>!params.p_after_name||row.name>params.p_after_name||(row.name===params.p_after_name&&row.slug>params.p_after_slug)).slice(0,13).map(({slug,name})=>({slug,name})));}
    if(url.pathname.endsWith('/categories')){return Response.json([{slug:'herramientas',name:'Herramientas',sort_order:0}]);}
    assert.equal(url.pathname,'/rest/v1/addons');
    const slug=url.searchParams.get('slug')??'';
    if(slug.startsWith('in.')){assert.equal(url.searchParams.get('limit'),'12');assert.equal(url.searchParams.get('addon_images.limit'),'1');assert.ok(!url.searchParams.get('select')!.includes('description'));return Response.json(rows.filter(row=>slug.slice(4,-1).split(',').includes(row.slug)));}
    assert.equal(url.searchParams.get('limit'),'1');return Response.json(rows.filter(row=>slug===`eq.${row.slug}`));
  };
  const previous={...process.env};process.env['SUPABASE_URL']='https://example.supabase.co';process.env['SUPABASE_PUBLISHABLE_KEY']='sb_publishable_PaginationTest123';
  const catalog=createCatalogHandler(transport),addon=createAddonHandler(transport),server=createServer((req,res)=>{void(req.url?.startsWith('/api/addon')?addon(req,res):catalog(req,res));});server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`;
  context.after(async()=>{for(const key of ['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY']){if(previous[key]===undefined){delete process.env[key];}else{process.env[key]=previous[key];}}server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));});
  const first=await(await fetch(base+'/api/catalog?q=ruta&category=herramientas')).json() as {addons:typeof rows;nextCursor:string};assert.equal(first.addons.length,12);assert.ok(first.nextCursor);assert.equal(first.addons[0]!.description,'');
  const second=await(await fetch(base+'/api/catalog?q=ruta&category=herramientas&cursor='+first.nextCursor)).json() as typeof first;assert.equal(second.addons.length,12);assert.equal(second.addons[0]!.slug,'addon-13');
  const third=await(await fetch(base+'/api/catalog?q=ruta&category=herramientas&cursor='+second.nextCursor)).json() as typeof first;assert.equal(third.addons.length,1);assert.equal(third.nextCursor,null);
  const before=calls;assert.equal((await fetch(base+'/api/catalog?q=different&cursor='+first.nextCursor)).status,400);assert.equal(calls,before);
  assert.equal((await fetch(base+'/api/catalog?q='+'a'.repeat(161))).status,400);
  const detail=await(await fetch(base+'/api/addon?slug=addon-25')).json() as {addon:{description:string}};assert.equal(detail.addon.description,rows[24]!.description);assert.equal((await fetch(base+'/api/addon?slug=missing')).status,404);
});
