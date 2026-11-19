import {createHmac,timingSafeEqual} from 'node:crypto';
import {SUPPORT_AMOUNTS} from './config/support-policy.ts';
import {supportLedgerConfig} from './config/support-ledger.ts';

const lifetime=7200;
export class InvalidReceipt extends Error {}
type Receipt={v:1;sid:string;amount:number;exp:number};
function secret(env:NodeJS.ProcessEnv):Buffer{
 const value=env['SUPPORT_RECEIPT_SECRET'];if(!value||!/^[a-f0-9]{64}$/i.test(value))throw new Error('Receipt configuration unavailable.');
 return Buffer.from(value,'hex');
}
function signature(payload:string,env:NodeJS.ProcessEnv){return createHmac('sha256',secret(env)).update('wfa-support-receipt-v1.'+payload).digest();}
export function issueReceipt(sid:string,amount:number,env:NodeJS.ProcessEnv,now=Math.floor(Date.now()/1000)):string{
 if(!/^cs_test_[A-Za-z0-9_]{1,240}$/.test(sid)||!SUPPORT_AMOUNTS.includes(amount as typeof SUPPORT_AMOUNTS[number]))throw new Error('Invalid test receipt.');
 const payload=Buffer.from(JSON.stringify({v:1,sid,amount,exp:now+lifetime})).toString('base64url');
 return payload+'.'+signature(payload,env).toString('base64url');
}
export function verifyReceipt(token:unknown,env:NodeJS.ProcessEnv,now=Math.floor(Date.now()/1000)):Receipt{
 if(typeof token!=='string'||token.length>1024||!/^[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+$/.test(token))throw new InvalidReceipt();
 const [payload,sig]=token.split('.');const actual=Buffer.from(sig!,'base64url'),expected=signature(payload!,env);
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new InvalidReceipt();
 let data:Receipt;try{data=JSON.parse(Buffer.from(payload!,'base64url').toString('utf8'));}catch{throw new InvalidReceipt();}
 if(!data||data.v!==1||!/^cs_test_[A-Za-z0-9_]{1,240}$/.test(data.sid)||!SUPPORT_AMOUNTS.includes(data.amount as typeof SUPPORT_AMOUNTS[number])||!Number.isSafeInteger(data.exp)||data.exp<=now||data.exp>now+lifetime+60)throw new InvalidReceipt();
 return data;
}
export type ReceiptRecord={state:'pending'|'paid'|'failed'|'expired';amount:number;currency:'eur'};
export type ReadReceiptRecord=(sid:string)=>Promise<ReceiptRecord|null>;
export function receiptLedger(fetcher:typeof fetch=fetch):ReadReceiptRecord{
 return async sid=>{
  const config=supportLedgerConfig(process.env);if(!config)throw new Error('Ledger unavailable.');
  const response=await fetcher(config.origin+'/rest/v1/rpc/read_support_test_status',{method:'POST',redirect:'error',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({p_session_id:sid}),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error('Status unavailable.');
  const data:unknown=await response.json();if(data===null)return null;
  const row=data as ReceiptRecord;
  if(!row||!['pending','paid','failed','expired'].includes(row.state)||row.currency!=='eur'||!SUPPORT_AMOUNTS.includes(row.amount as typeof SUPPORT_AMOUNTS[number]))throw new Error('Invalid status.');
  return {state:row.state,amount:row.amount,currency:'eur'};
 };
}
