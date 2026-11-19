import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import Stripe from 'stripe';
import { createSupportWebhookHandler } from '../../api/support-webhook.ts';
import { supportLedger, type SupportEvent } from '../../server/support-webhook.ts';

test('webhook verifies original bytes and freshness, projects no personal data and retries persistence failures',async context=>{
  const secret='whsec_SyntheticLocalSigningSecret12345';
  const keys=['STRIPE_TEST_WEBHOOK_ENABLED','STRIPE_TEST_WEBHOOK_SECRET'];const previous=keys.map(key=>process.env[key]);
  process.env[keys[0]!]='true';process.env[keys[1]!]=secret;
  let calls=0,fail=false;const stored=new Set<string>();
  const handler=createSupportWebhookHandler(async event=>{calls++;assert.deepEqual(Object.keys(event).sort(),['amount','currency','eventCreated','eventId','eventType','sessionId','state']);assert.equal(JSON.stringify(event).includes('example.com'),false);if(fail)throw new Error('private persistence error');const duplicate=stored.has(event.eventId);stored.add(event.eventId);return duplicate?'duplicate':'recorded';});
  const server=createServer((req,res)=>{void handler(req,res);});server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`;
  context.after(async()=>{keys.forEach((key,i)=>{if(previous[i]===undefined)delete process.env[key];else process.env[key]=previous[i];});server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));});
  const event={id:'evt_fixture',object:'event',type:'checkout.session.completed',livemode:false,created:1700000000,data:{object:{id:'cs_test_fixture',object:'checkout.session',mode:'payment',livemode:false,status:'complete',payment_status:'paid',amount_total:500,currency:'eur',metadata:{integration:'wfa_support_v1',purpose:'platform_support_test'},customer_details:{email:'private@example.com'}}}};
  const payload=JSON.stringify(event,null,2);
  const signature=(body:string,timestamp=Math.floor(Date.now()/1000))=>Stripe.webhooks.generateTestHeaderString({payload:body,secret,timestamp});
  const post=(body=payload,header=signature(body))=>fetch(base,{method:'POST',headers:{'Stripe-Signature':header,'Content-Type':'application/json'},body});
  assert.equal((await post()).status,200);assert.deepEqual(await(await post()).json(),{status:'duplicate'});assert.equal(stored.size,1);
  assert.equal((await post(payload+' ',signature(payload))).status,400);
  assert.equal((await post(payload,signature(payload,Math.floor(Date.now()/1000)-301))).status,400);
  assert.equal((await post(payload,signature(payload,Math.floor(Date.now()/1000)+301))).status,400);
  assert.equal((await post(payload,'t=0,v1=bad')).status,400);
  assert.equal((await post(JSON.stringify({...event,livemode:true}))).status,400);
  assert.equal((await post(JSON.stringify({...event,data:{object:{...event.data.object,amount_total:1}}}))).status,400);
  assert.equal((await post(JSON.stringify({...event,type:'customer.created'}))).status,200);
  assert.equal((await post(JSON.stringify({...event,data:{object:{...event.data.object,metadata:{}}}}))).status,200);
  assert.equal(calls,2);
  fail=true;const failed=await post();assert.equal(failed.status,503);assert.equal((await failed.text()).includes('private persistence'),false);
  fail=false;assert.equal((await post()).status,200);
  assert.equal((await post('x'.repeat(262145))).status,413);
  assert.equal((await fetch(base)).status,405);
  delete process.env[keys[0]!];assert.equal((await post()).status,503);
});

test('ledger transport uses a fixed server-only RPC and requires confirmed persistence',async context=>{
  const keys=['SUPABASE_URL','SUPABASE_WEBHOOK_SECRET_KEY'];const previous=keys.map(key=>process.env[key]);
  context.after(()=>{keys.forEach((key,i)=>{if(previous[i]===undefined)delete process.env[key];else process.env[key]=previous[i];});});
  process.env[keys[0]!]='https://example.supabase.co';process.env[keys[1]!]='sb_secret_SyntheticServerOnlyKey123456';
  const projected:SupportEvent={eventId:'evt_fixture',eventType:'checkout.session.completed',sessionId:'cs_test_fixture',amount:500,currency:'eur',state:'paid',eventCreated:1700000000};
  const record=supportLedger(async(input,init)=>{assert.equal(String(input),'https://example.supabase.co/rest/v1/rpc/record_support_test_event');const headers=new Headers(init?.headers);assert.equal(headers.get('Authorization'),null);assert.equal(headers.get('cookie'),null);assert.equal(init?.redirect,'error');assert.equal(JSON.parse(String(init?.body)).p_amount,500);return Response.json('recorded');});
  assert.equal(await record(projected),'recorded');
  await assert.rejects(supportLedger(async()=>Response.json({error:'database detail'},{status:500}))(projected),/Persistence failed/);
  await assert.rejects(supportLedger(async()=>Response.json('unexpected'))(projected),/Unexpected/);
});
