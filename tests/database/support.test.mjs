import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

test('private support ledger is atomic, idempotent, order independent and durable',async context=>{
  const directory=await mkdtemp(join(tmpdir(),'wfa-support-ledger-'));
  let db=new PGlite(directory);
  context.after(async()=>{await db.close();if(!resolve(directory).startsWith(resolve(tmpdir())+sep+'wfa-support-ledger-'))throw new Error('Unexpected test directory');await rm(directory,{recursive:true,force:true});});
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema private;');
  await db.exec(await readFile(new URL('../../supabase/migrations/20261119163932_support_webhook_ledger.sql',import.meta.url),'utf8'));
  const receiptMigration=(await readdir(new URL('../../supabase/migrations/',import.meta.url))).find(name=>name.endsWith('_support_receipt_status.sql'));
  await db.exec(await readFile(new URL('../../supabase/migrations/'+receiptMigration,import.meta.url),'utf8'));
  const record=async(id,state='paid',type='checkout.session.completed',amount=500,session='cs_test_fixture')=>db.transaction(async tx=>{
    await tx.exec('set local role service_role');
    return (await tx.query('select public.record_support_test_event($1,$2,$3,$4,$5,$6,$7) as result',[id,type,session,amount,'eur',state,1700000000])).rows[0].result;
  });
  assert.equal(await record('evt_paid'),'recorded');
  assert.equal(await record('evt_paid'),'duplicate');
  await db.transaction(async tx=>{await tx.exec('set local role service_role');assert.deepEqual((await tx.query("select public.read_support_test_status('cs_test_fixture') as receipt")).rows[0].receipt,{state:'paid',amount:500,currency:'eur'});assert.equal((await tx.query("select public.read_support_test_status('cs_test_unknown') as receipt")).rows[0].receipt,null);});
  await record('evt_expired','expired','checkout.session.expired');
  await record('evt_pending','pending');
  await record('evt_failed','failed','checkout.session.async_payment_failed');
  assert.equal((await db.query('select state from private.support_test_sessions')).rows[0].state,'paid');
  assert.equal((await db.query('select count(*)::int as count from private.support_test_sessions')).rows[0].count,1);
  await assert.rejects(record('evt_paid','paid','checkout.session.completed',1000),/Conflicting duplicate/);
  await assert.rejects(record('evt_conflict','paid','checkout.session.completed',1000),/Conflicting session/);
  assert.equal((await db.query("select count(*)::int as count from private.support_test_events where event_id='evt_conflict'")).rows[0].count,0);
  await assert.rejects(record('evt_invalid','paid','checkout.session.expired',500,'cs_test_new'),/Inconsistent/);
  await assert.rejects(record('evt_live','paid','checkout.session.completed',500,'cs_live_invalid'),/check constraint/);
  await record('evt_expired_first','expired','checkout.session.expired',500,'cs_test_late');
  await record('evt_paid_late','paid','checkout.session.async_payment_succeeded',500,'cs_test_late');
  for(const role of ['anon','authenticated']) {
    await assert.rejects(db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query("select public.read_support_test_status('cs_test_fixture')");}),/permission denied/);
    await assert.rejects(db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query('select * from private.support_test_sessions');}),/permission denied/);
    await assert.rejects(db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query("select public.record_support_test_event('evt_forbidden','checkout.session.completed','cs_test_forbidden',500,'eur','paid',1700000000)");}),/permission denied/);
  }
  await db.close(); db=new PGlite(directory);
  assert.equal((await db.query("select state from private.support_test_sessions where session_id='cs_test_late'")).rows[0].state,'paid');
  assert.equal(await record('evt_paid'),'duplicate');
});
