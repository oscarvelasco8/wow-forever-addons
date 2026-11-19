import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import Stripe from 'stripe';
import { PGlite } from '@electric-sql/pglite';
import { createSupportWebhookHandler } from '../api/support-webhook.ts';
import { supportLedger } from '../server/support-webhook.ts';

// Isolated PostgreSQL and signed fixtures: no cloud connections or real credentials.
const directory=await mkdtemp(join(tmpdir(),'wfa-webhook-verification-'));
let db=new PGlite(directory);
const keys=['STRIPE_TEST_WEBHOOK_ENABLED','STRIPE_TEST_WEBHOOK_SECRET','SUPABASE_URL','SUPABASE_WEBHOOK_SECRET_KEY'];
const previous=keys.map(key=>process.env[key]);
const secret='whsec_SyntheticLocalVerification12345';
const checks:string[]=[];
const record=supportLedger(async(input,init)=>{
  assert.equal(String(input),'https://fixture.supabase.co/rest/v1/rpc/record_support_test_event');
  const body=JSON.parse(String(init?.body)) as Record<string,unknown>;
  const result=await db.transaction(async tx=>{await tx.exec('set local role service_role');return tx.query<{result:string}>('select public.record_support_test_event($1,$2,$3,$4,$5,$6,$7) as result',[body['p_event_id'],body['p_event_type'],body['p_session_id'],body['p_amount'],body['p_currency'],body['p_state'],body['p_event_created']]);});
  return Response.json(result.rows[0]!.result);
});
const handler=createSupportWebhookHandler(record);
const server=createServer((req,res)=>{void handler(req,res);});
try {
  process.env[keys[0]!]='true';process.env[keys[1]!]=secret;process.env[keys[2]!]='https://fixture.supabase.co';process.env[keys[3]!]='sb_secret_SyntheticVerificationKey12345';
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema private;');
  await db.exec(await readFile(new URL('../supabase/migrations/20261119163932_support_webhook_ledger.sql',import.meta.url),'utf8'));
  server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address!=='string');
  const base=`http://127.0.0.1:${address.port}`;
  function payload(id:string,type='checkout.session.completed',paid=true) {return JSON.stringify({id,type,object:'event',livemode:false,created:1700000000,data:{object:{id:'cs_test_localverification',object:'checkout.session',mode:'payment',livemode:false,status:type.endsWith('expired')?'expired':'complete',payment_status:paid?'paid':'unpaid',amount_total:500,currency:'eur',metadata:{integration:'wfa_support_v1',purpose:'platform_support_test'},customer_details:{email:'not-stored@example.invalid'}}}});}
  async function post(body:string,signature?:string){return fetch(base,{method:'POST',headers:{'Stripe-Signature':signature??Stripe.webhooks.generateTestHeaderString({payload:body,secret})},body});}
  const paid=payload('evt_localpaid');
  assert.equal((await post(paid,'t=0,v1=invalid')).status,400);
  assert.equal((await db.query<{count:number}>('select count(*)::int as count from private.support_test_events')).rows[0]?.['count'],0);
  checks.push('Firma inválida: HTTP400 y cero escrituras.');
  assert.equal((await post(paid)).status,200);
  assert.deepEqual(await(await post(paid)).json(),{status:'duplicate'});
  assert.equal((await db.query<{count:number}>('select count(*)::int as count from private.support_test_events')).rows[0]?.['count'],1);
  checks.push('Evento firmado y repetido: una aportación y un evento, sin duplicados.');
  assert.equal((await post(payload('evt_localexpired','checkout.session.expired',false))).status,200);
  assert.equal((await db.query<{state:string}>('select state from private.support_test_sessions')).rows[0]?.['state'],'paid');
  checks.push('Caducidad tardía: conserva la confirmación previa.');
  const columns=(await db.query<{column_name:string}>("select column_name from information_schema.columns where table_schema='private' and table_name in ('support_test_events','support_test_sessions')")).rows.map(row=>row.column_name);
  assert.ok(!columns.some(name=>/email|customer|payload|card/.test(name)));
  for(const role of ['anon','authenticated'])await assert.rejects(db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query('select * from private.support_test_events');}),/permission denied/);
  checks.push('Registro privado: sin correo, tarjeta ni payload; visitantes y usuarios sin acceso.');
  await db.close();
  assert.equal((await post(payload('evt_duringoutage'))).status,503);
  checks.push('Almacenamiento no disponible: HTTP503 para permitir reintento.');
  db=new PGlite(directory);
  assert.equal((await db.query<{state:string}>('select state from private.support_test_sessions')).rows[0]?.['state'],'paid');
  assert.deepEqual(await(await post(paid)).json(),{status:'duplicate'});
  assert.equal((await post(payload('evt_duringoutage'))).status,200);
  checks.push('Reapertura de PostgreSQL: persiste el estado y se recupera el reintento.');
  const date=new Intl.DateTimeFormat('es-ES',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Madrid'}).format(new Date());
  const html=`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verificación local del webhook</title><style>body{margin:0;background:#11160f;color:#eee9db;font:17px/1.6 system-ui}header{padding:14px 24px;background:#302b1b;color:#e1ca83;border-bottom:1px solid #7c7044}main{max-width:900px;margin:auto;padding:32px 24px}h1{font:42px/1.15 Georgia;color:#ead7a2}p{color:#c3c5b8}li{margin:18px 0;padding-left:8px}li::marker{color:#b5d69d}.state{color:#c6e5af;font-weight:700}footer{border-top:1px solid #46503b;margin-top:28px;padding-top:16px;font-size:14px}@media(max-width:400px){h1{font-size:30px}main{padding:20px}body{font-size:15px}}</style><header>INFORME DE PRUEBAS LOCALES · EVENTOS FICTICIOS</header><main><p>WoW Forever Addons · ${date}</p><h1>Webhook y registro privado</h1><p class="state">6 comprobaciones integradas aprobadas</p><p>HTTP local → verificación de firma → adaptador RPC simulado → PostgreSQL persistente real (PGlite).</p><ul>${checks.map(check=>`<li>${check}</li>`).join('')}</ul><footer>Sin conexión con Stripe ni Supabase remoto. Sin cobros. Checkout permanece desactivado. Migración preparada solo localmente; sandbox y validación remota pendientes.</footer></main></html>`;
  await writeFile('docs/capturas/fase6-webhook-informe-local.html',html);
  console.log(checks.join('\n'));
  console.log('PASS: informe local generado; sin conexión a servicios externos.');
} finally {
  server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));
  await db.close();keys.forEach((key,i)=>{if(previous[i]===undefined)delete process.env[key];else process.env[key]=previous[i];});
  if(!resolve(directory).startsWith(resolve(tmpdir())+sep+'wfa-webhook-verification-'))throw new Error('Unexpected temporary path');
  await rm(directory,{recursive:true,force:true});
}
