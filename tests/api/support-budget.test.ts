import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkoutBudget } from '../../server/support-checkout-budget.ts';

test('checkout budget requires a trusted fixed RPC and validates its decision',async context=>{
  const keys=['SUPABASE_URL','SUPABASE_WEBHOOK_SECRET_KEY'];const previous=keys.map(key=>process.env[key]);
  context.after(()=>keys.forEach((key,i)=>{if(previous[i]===undefined)delete process.env[key];else process.env[key]=previous[i];}));
  process.env[keys[0]!]='https://fixture.supabase.co';process.env[keys[1]!]='sb_secret_SyntheticBudgetKey12345';
  const admit=checkoutBudget(async(input,init)=>{assert.equal(String(input),'https://fixture.supabase.co/rest/v1/rpc/admit_support_test_checkout');assert.equal(init?.body,'{}');assert.equal(init?.redirect,'error');assert.equal(new Headers(init?.headers).get('cookie'),null);return Response.json({allowed:false,retry_after:20});});
  assert.deepEqual(await admit(),{allowed:false,retryAfter:20});
  for(const data of [{allowed:true,retry_after:20},{allowed:false,retry_after:0},{allowed:false,retry_after:3601},{allowed:'true',retry_after:0}])await assert.rejects(checkoutBudget(async()=>Response.json(data))(),/Invalid protection/);
  await assert.rejects(checkoutBudget(async()=>new Response('private database detail',{status:503}))(),/Protection unavailable/);
  delete process.env[keys[1]!];await assert.rejects(admit(),/Protection unavailable/);
});
