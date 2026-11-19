import type { IncomingMessage, ServerResponse } from 'node:http';
import Stripe from 'stripe';
import { projectSupportEvent, supportLedger, type RecordSupportEvent } from '../server/support-webhook.ts';

export const config = { api: { bodyParser: false } };
export function createSupportWebhookHandler(record: RecordSupportEvent = supportLedger()) {
  return async (request: IncomingMessage,response: ServerResponse): Promise<void> => {
    response.setHeader('Cache-Control','no-store'); response.setHeader('Content-Type','application/json'); response.setHeader('X-Content-Type-Options','nosniff');
    const send=(status:number,error:string)=>{response.writeHead(status).end(JSON.stringify({status:error}));};
    if(request.method!=='POST'){response.setHeader('Allow','POST');send(405,'method_not_allowed');return;}
    const secret=process.env['STRIPE_TEST_WEBHOOK_SECRET'];
    if(process.env['STRIPE_TEST_WEBHOOK_ENABLED']!=='true' || !secret || !/^whsec_[A-Za-z0-9]{16,}$/.test(secret)){send(503,'webhook_unavailable');return;}
    const signature=request.headers['stripe-signature'];
    if(typeof signature!=='string' || signature.length>2048){send(400,'invalid_signature');return;}
    let event: Stripe.Event;
    try {
      const chunks:Buffer[]=[]; let size=0;
      for await(const chunk of request){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>262144){send(413,'payload_too_large');return;}chunks.push(bytes);}
      // No JSON parse, decode or reserialization before signature verification.
      event=Stripe.webhooks.constructEvent(Buffer.concat(chunks),signature,secret,300);
      const timestamps=signature.split(',').filter(part=>part.startsWith('t='));
      const timestamp=Number(timestamps[0]?.slice(2));
      if(timestamps.length!==1 || !Number.isSafeInteger(timestamp) || Math.abs(Math.floor(Date.now()/1000)-timestamp)>300) throw new Error('Invalid signature timestamp.');
    } catch {send(400,'invalid_signature');return;}
    let projected;
    try {projected=projectSupportEvent(event);} catch {send(400,'invalid_event');return;}
    if(!projected){send(200,'ignored');return;}
    try { const result=await record(projected); send(200,result); }
    catch {send(503,'persistence_unavailable');}
  };
}
export default createSupportWebhookHandler();
