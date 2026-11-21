import {test} from 'node:test';
import assert from 'node:assert/strict';
import checkout from '../../api/support-checkout.ts';
import status from '../../api/support-status.ts';
import webhook from '../../api/support-webhook.ts';
test('retired payment endpoints cannot create sessions or accept events, even with stale environment flags',async()=>{
 process.env['STRIPE_TEST_CHECKOUT_ENABLED']='true';process.env['STRIPE_TEST_WEBHOOK_ENABLED']='true';
 try{for(const handler of [checkout,status,webhook])for(const method of ['GET','POST']){
 let code=0,body='';const response={writeHead:(value:number)=>{code=value;},end:(value:string)=>{body=value;}};
 handler({method} as never,response as never);assert.equal(code,410);assert.deepEqual(JSON.parse(body),{error:'support_integration_retired'});
 }}finally{delete process.env['STRIPE_TEST_CHECKOUT_ENABLED'];delete process.env['STRIPE_TEST_WEBHOOK_ENABLED'];}
});
