import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('checkout quota is database owned, bounded, private and expires by fixed windows',async context=>{
  const db=new PGlite();context.after(()=>db.close());
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema private;');
  await db.exec(await readFile(new URL('../../supabase/migrations/20261119163933_support_checkout_budget.sql',import.meta.url),'utf8'));
  const admit=()=>db.transaction(async tx=>{await tx.exec('set local role service_role');return(await tx.query('select public.admit_support_test_checkout() as result')).rows[0].result;});
  for(let i=0;i<6;i++)assert.deepEqual(await admit(),{allowed:true,retry_after:0});
  const denied=await admit();assert.equal(denied.allowed,false);assert.ok(denied.retry_after>=1&&denied.retry_after<=60);
  assert.equal((await db.query('select requests from private.support_test_checkout_budget where window_seconds=60')).rows[0].requests,6);
  await db.exec("delete from private.support_test_checkout_budget;insert into private.support_test_checkout_budget values(3600,date_trunc('hour',clock_timestamp()),30);");
  const hourly=await admit();assert.equal(hourly.allowed,false);assert.ok(hourly.retry_after>0&&hourly.retry_after<=3600);
  assert.equal((await db.query('select count(*)::int as count from private.support_test_checkout_budget')).rows[0].count,1);
  await db.exec("delete from private.support_test_checkout_budget;insert into private.support_test_checkout_budget values(60,clock_timestamp()-interval '25 hours',6),(3600,clock_timestamp()-interval '25 hours',30);");
  assert.equal((await admit()).allowed,true);
  assert.equal((await db.query("select count(*)::int as count from private.support_test_checkout_budget where window_start<clock_timestamp()-interval '24 hours'")).rows[0].count,0);
  for(const role of ['anon','authenticated']){
    await assert.rejects(db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query('select public.admit_support_test_checkout()');}),/permission denied/);
    await assert.rejects(db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query('select * from private.support_test_checkout_budget');}),/permission denied/);
  }
});
