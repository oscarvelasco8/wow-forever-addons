import {test} from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'node:http';import {once} from 'node:events';
import {issueReceipt,verifyReceipt,InvalidReceipt,receiptLedger,type ReceiptRecord} from '../../server/support-receipt.ts';
import {createSupportStatusHandler} from '../../api/support-status.ts';

test('receipt capabilities bind test session and amount, expire and reject tampering',()=>{
 const env={SUPPORT_RECEIPT_SECRET:'a'.repeat(64)},token=issueReceipt('cs_test_fixture',500,env,1000);
 assert.equal(verifyReceipt(token,env,1001).sid,'cs_test_fixture');
 assert.throws(()=>verifyReceipt(token,env,8200),InvalidReceipt);
 const parts=token.split('.');const forged=Buffer.from(JSON.stringify({v:1,sid:'cs_test_other',amount:500,exp:8200})).toString('base64url')+'.'+parts[1];
 assert.throws(()=>verifyReceipt(forged,env,1001),InvalidReceipt);
 assert.throws(()=>verifyReceipt(token,{SUPPORT_RECEIPT_SECRET:'b'.repeat(64)},1001),InvalidReceipt);
 assert.throws(()=>issueReceipt('cs_live_fixture',500,env));
});

test('status HTTP requires the capability before lookup, never trusts return URL and only reports durable state',async context=>{
 const keys=['SUPPORT_RECEIPT_SECRET','STRIPE_TEST_SITE_URL'];const previous=keys.map(key=>process.env[key]);process.env['SUPPORT_RECEIPT_SECRET']='a'.repeat(64);process.env['STRIPE_TEST_SITE_URL']='http://localhost:4200';
 let calls=0,fail=false;let row:ReceiptRecord|null=null;
 const handler=createSupportStatusHandler(async sid=>{calls++;assert.equal(sid,'cs_test_fixture');if(fail)throw new Error('private provider detail');return row;});
 const server=createServer((req,res)=>{void handler(req,res);});server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`;
 context.after(async()=>{keys.forEach((key,i)=>{if(previous[i]===undefined)delete process.env[key];else process.env[key]=previous[i];});server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));});
 const token=issueReceipt('cs_test_fixture',500,process.env),post=(value:unknown={receipt:token},origin='http://localhost:4200')=>fetch(base,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(value)});
 assert.equal((await fetch(base+'?checkout=return&session_id=cs_test_fixture')).status,405);assert.equal(calls,0);
 assert.equal((await post({receipt:'forged.token'})).status,403);assert.equal(calls,0);
 assert.equal((await post(undefined,'https://evil.example')).status,403);assert.equal(calls,0);
 assert.equal((await post({receipt:token,sessionId:'cs_test_other'})).status,400);
 assert.equal((await post({receipt:issueReceipt('cs_test_fixture',500,process.env,1000)})).status,403);
 assert.equal((await post({receipt:'x'.repeat(2100)})).status,413);
 assert.equal((await(await post()).json() as {state:string}).state,'pending');
 row={state:'paid',amount:500,currency:'eur'};const paid=await post();assert.equal(paid.headers.get('cache-control'),'no-store');const data=await paid.json();assert.deepEqual(data,{mode:'test',state:'paid',amount:500,currency:'eur'});
 row={state:'paid',amount:1000,currency:'eur'};assert.equal((await post()).status,503);
 fail=true;const unavailable=await post();assert.equal(unavailable.status,503);assert.equal((await unavailable.text()).includes('private provider'),false);
});

test('receipt ledger exposes only state, amount and currency through fixed backend RPC',async context=>{
 const keys=['SUPABASE_URL','SUPABASE_WEBHOOK_SECRET_KEY'];const previous=keys.map(key=>process.env[key]);context.after(()=>keys.forEach((key,i)=>{if(previous[i]===undefined)delete process.env[key];else process.env[key]=previous[i];}));
 process.env['SUPABASE_URL']='https://fixture.supabase.co';process.env['SUPABASE_WEBHOOK_SECRET_KEY']='sb_secret_SyntheticReceiptKey12345';
 const read=receiptLedger(async(input,init)=>{assert.equal(String(input),'https://fixture.supabase.co/rest/v1/rpc/read_support_test_status');assert.equal(new Headers(init?.headers).get('cookie'),null);assert.deepEqual(JSON.parse(String(init?.body)),{p_session_id:'cs_test_fixture'});return Response.json({state:'paid',amount:500,currency:'eur',extra:'not serialized'});});
 assert.deepEqual(await read('cs_test_fixture'),{state:'paid',amount:500,currency:'eur'});
});
