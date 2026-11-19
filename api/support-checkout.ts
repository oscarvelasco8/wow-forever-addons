import type { IncomingMessage, ServerResponse } from 'node:http';
import { checkoutInput, createSupportSession, supportConfig, SUPPORT_AMOUNTS, validTestCheckout, type CreateSupportSession } from '../server/support-checkout.ts';
import { checkoutBudget, type CheckoutAdmission } from '../server/support-checkout-budget.ts';
import {issueReceipt} from '../server/support-receipt.ts';

export function createSupportCheckoutHandler(createSession: CreateSupportSession = createSupportSession, admit: CheckoutAdmission = checkoutBudget()) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const send = (status: number, data: unknown) => { response.writeHead(status).end(JSON.stringify(data)); };
    if (!['GET', 'POST'].includes(request.method ?? '')) {
      response.setHeader('Allow', 'GET, POST'); send(405, { error: 'method_not_allowed' }); return;
    }
    try {
      const config = supportConfig(process.env);
      if (request.method === 'GET') { send(200, { enabled: !!config, mode: 'test', currency: 'eur', amounts: SUPPORT_AMOUNTS }); return; }
      if (!config) { send(503, { error: 'support_unavailable' }); return; }
      if (request.headers.origin !== config.origin) { send(403, { error: 'origin_denied' }); return; }
      if (request.headers['content-type']?.split(';')[0]?.trim() !== 'application/json') { send(415, { error: 'json_required' }); return; }
      const chunks: Buffer[] = []; let length = 0;
      for await (const chunk of request) {
        const bytes = Buffer.from(chunk); length += bytes.length;
        if (length > 1024) { send(413, { error: 'request_too_large' }); return; }
        chunks.push(bytes);
      }
      let input;
      try { input = checkoutInput(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { /* Invalid JSON. */ }
      if (!input) { send(400, { error: 'invalid_support_request' }); return; }
      const decision = await admit();
      if (!decision.allowed) {
        response.setHeader('Retry-After', String(decision.retryAfter));
        send(429, { error: 'support_rate_limited', retryAfter: decision.retryAfter }); return;
      }
      const session=await createSession(config,input);
      const url = validTestCheckout(session);
      if (!url) throw new Error('Invalid test session.');
      send(200, { url, mode: 'test', sessionId:session.id, receipt:issueReceipt(session.id,input.amount,process.env) });
    } catch { send(503, { error: 'support_unavailable' }); }
  };
}
export default createSupportCheckoutHandler();
