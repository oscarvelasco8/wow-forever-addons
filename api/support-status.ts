import type {IncomingMessage,ServerResponse} from 'node:http';
import {readSiteOrigin} from '../server/config/site.ts';
import {InvalidReceipt,verifyReceipt,receiptLedger,type ReadReceiptRecord} from '../server/support-receipt.ts';

export function createSupportStatusHandler(read:ReadReceiptRecord=receiptLedger()){
 return async(request:IncomingMessage,response:ServerResponse):Promise<void>=>{
  response.setHeader('Cache-Control','no-store');response.setHeader('Content-Type','application/json');response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('Referrer-Policy','no-referrer');
  const send=(status:number,data:unknown)=>{response.writeHead(status).end(JSON.stringify(data));};
  if(request.method!=='POST'){response.setHeader('Allow','POST');send(405,{error:'method_not_allowed'});return;}
  try{
   const origin=readSiteOrigin(process.env['STRIPE_TEST_SITE_URL']);
   if(!origin)throw new Error('Unavailable origin.');
   if(request.headers.origin!==origin){send(403,{error:'receipt_unavailable'});return;}
   if(request.headers['content-type']?.split(';')[0]?.trim()!=='application/json'){send(415,{error:'json_required'});return;}
   const chunks:Buffer[]=[];let size=0;
   for await(const chunk of request){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>2048){send(413,{error:'request_too_large'});return;}chunks.push(bytes);}
   let input:unknown;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{send(400,{error:'invalid_receipt_request'});return;}
   if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).join(',')!=='receipt'){send(400,{error:'invalid_receipt_request'});return;}
   const proof=verifyReceipt((input as {receipt:unknown}).receipt,process.env);
   const record=await read(proof.sid);
   if(record&&(record.amount!==proof.amount||record.currency!=='eur'))throw new Error('Mismatched status.');
   send(200,{state:record?.state??'pending',amount:proof.amount,currency:'eur',mode:'test'});
  }catch(error){send(error instanceof InvalidReceipt?403:503,{error:error instanceof InvalidReceipt?'receipt_unavailable':'verification_unavailable'});}
 };
}
export default createSupportStatusHandler();
