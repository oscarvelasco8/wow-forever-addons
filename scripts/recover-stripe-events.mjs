import {loadEnvFile} from 'node:process';
import Stripe from 'stripe';
import {projectSupportEvent} from '../server/support-webhook.ts';

// Manual development recovery only. No raw events, keys or customer data in output.
loadEnvFile('.env');
const key=process.env.STRIPE_TEST_SECRET_KEY,secret=process.env.STRIPE_TEST_WEBHOOK_SECRET;
if(!/^sk_test_[A-Za-z0-9]{16,}$/.test(key??'')||!/^whsec_[A-Za-z0-9]{16,}$/.test(secret??''))throw new Error('Configure test credentials locally.');
const argument=process.argv[2]??'60';
if(!/^\d+$/.test(argument)||Number(argument)<1||Number(argument)>1440)throw new Error('Specify a window of 1..1440 minutes.');
const stripe=new Stripe(key,{apiVersion:'2026-11-18.endive',timeout:10000,maxNetworkRetries:0});
const receiver='http://127.0.0.1:3001/api/support-webhook';
const cutoff=Math.floor(Date.now()/1000)-Number(argument)*60;
const counts={recorded:0,duplicate:0,skipped:0,failed:0};
async function deliver(event){
 const payload=JSON.stringify(event);
 return fetch(receiver,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json','Stripe-Signature':Stripe.webhooks.generateTestHeaderString({payload,secret})},body:payload,signal:AbortSignal.timeout(12000)});
}
try{
 // Verify that the running API has the current listener secret before touching events.
 const probe=await deliver({id:'evt_recovery_probe',object:'event',type:'integration.connection_check',livemode:false,created:Math.floor(Date.now()/1000),data:{object:{}}});
 if(probe.status!==200||(await probe.json()).status!=='ignored')throw new Error('Receiver not ready.');
 let after;
 for(let page=0;page<10;page++){
  const events=await stripe.events.list({limit:100,created:{gte:cutoff},types:['checkout.session.completed','checkout.session.expired','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed'],...(after?{starting_after:after}:{})});
  for(const event of events.data){
   let projected;try{projected=projectSupportEvent(event);}catch{counts.failed++;continue;}
   if(!projected){counts.skipped++;continue;}
   try{const response=await deliver(event),data=await response.json();if(response.ok&&(data.status==='recorded'||data.status==='duplicate'))counts[data.status]++;else counts.failed++;}catch{counts.failed++;}
  }
  if(!events.has_more){console.log(JSON.stringify({mode:'test',minutes:Number(argument),...counts}));if(counts.failed)process.exitCode=1;break;}
  after=events.data.at(-1)?.id;
  if(page===9){console.log('Recuperación incompleta: ventana demasiado grande; reduce minutos.');process.exitCode=1;}
 }
}catch{console.error('No se completó la recuperación. Comprueba API, listener y configuración local; no se muestran detalles privados.');process.exitCode=1;}
