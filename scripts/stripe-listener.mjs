import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

// Read locally; never pass credentials in command arguments or print CLI output.
loadEnvFile(resolve('.env'));
const key=process.env.STRIPE_TEST_SECRET_KEY;
if(!/^sk_test_[A-Za-z0-9]{16,}$/.test(key??''))throw new Error('Configure the test key locally first.');
const executable=join(process.env.LOCALAPPDATA,'WoWForeverAddons/tools/stripe/1.55.13/stripe.exe');
if(!existsSync(executable))throw new Error('Verified Stripe CLI 1.55.13 is not installed.');
const childEnv={STRIPE_API_KEY:key};
for(const name of ['PATH','SystemRoot','APPDATA','LOCALAPPDATA','USERPROFILE','HOME','TEMP','TMP'])if(process.env[name])childEnv[name]=process.env[name];
const child=spawn(executable,['listen','--skip-update','--latest','--events-from','@self','--events','checkout.session.completed,checkout.session.expired,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed','--forward-to','http://127.0.0.1:3001/api/support-webhook'],{env:childEnv,windowsHide:true,stdio:['ignore','pipe','pipe']});
let ready=false,buffer='';
function consume(chunk){
 if(ready)return;
 buffer=(buffer+chunk.toString()).slice(-32768);
 const secret=buffer.match(/(whsec_[A-Za-z0-9]{16,})[ \r\n]/)?.[1];
 if(secret&&!ready){
  const path=resolve('.env');let env=readFileSync(path,'utf8');
  env=env.replace(/^STRIPE_TEST_WEBHOOK_SECRET=.*$/m,'STRIPE_TEST_WEBHOOK_SECRET='+secret);
  if(!/^STRIPE_TEST_WEBHOOK_SECRET=/m.test(env))env+='\nSTRIPE_TEST_WEBHOOK_SECRET='+secret+'\n';
  writeFileSync(path,env,{encoding:'utf8'});ready=true;buffer='';
  console.log('Listener Stripe TEST conectado; secreto guardado en .env sin mostrarlo.');
 }
 // Keep all raw CLI output, event payloads and secrets out of logs.
}
child.stdout.on('data',consume);child.stderr.on('data',consume);
child.on('error',()=>{console.error('No se pudo iniciar Stripe CLI.');process.exitCode=1;});
child.on('exit',code=>{console.log('Listener Stripe detenido.');process.exitCode=code??1;});
process.on('SIGINT',()=>child.kill());process.on('SIGTERM',()=>child.kill());
