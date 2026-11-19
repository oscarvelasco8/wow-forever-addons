import Stripe from 'stripe';
import { SUPPORT_AMOUNTS } from './support-checkout.ts';
import { supportLedgerConfig } from './config/support-ledger.ts';

export type SupportEvent = { eventId: string; eventType: string; sessionId: string; amount: number; currency: 'eur'; state: 'pending'|'expired'|'failed'|'paid'; eventCreated: number };
const types = ['checkout.session.completed','checkout.session.expired','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed'];
export function projectSupportEvent(event: Stripe.Event): SupportEvent | null {
  if (event.livemode !== false) throw new Error('Live event rejected.');
  if (!types.includes(event.type)) return null;
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.metadata?.['integration'] !== 'wfa_support_v1' || session.metadata?.['purpose'] !== 'platform_support_test') return null;
  if (!/^evt_[A-Za-z0-9_]{1,240}$/.test(event.id) || !Number.isSafeInteger(event.created) || event.created <= 0 ||
    session.object !== 'checkout.session' || session.livemode !== false || !/^cs_test_[A-Za-z0-9_]{1,240}$/.test(session.id) ||
    session.mode !== 'payment' || session.currency !== 'eur' || !SUPPORT_AMOUNTS.includes(session.amount_total as typeof SUPPORT_AMOUNTS[number]) ||
    !['paid','unpaid'].includes(session.payment_status)) throw new Error('Invalid support event.');
  let state: SupportEvent['state'];
  if (event.type === 'checkout.session.completed') {
    if (session.status !== 'complete') throw new Error('Inconsistent completed event.');
    state = session.payment_status === 'paid' ? 'paid' : 'pending';
  } else if (event.type === 'checkout.session.expired') {
    if (session.status !== 'expired' || session.payment_status !== 'unpaid') throw new Error('Inconsistent expiry.');
    state='expired';
  } else if (event.type === 'checkout.session.async_payment_succeeded') {
    if (session.status !== 'complete' || session.payment_status !== 'paid') throw new Error('Inconsistent confirmation.');
    state='paid';
  } else {
    if (session.status !== 'complete' || session.payment_status !== 'unpaid') throw new Error('Inconsistent failure.');
    state='failed';
  }
  return {eventId:event.id,eventType:event.type,sessionId:session.id,amount:session.amount_total!,currency:'eur',state,eventCreated:event.created};
}

export type RecordSupportEvent = (event: SupportEvent) => Promise<'recorded'|'duplicate'>;
export function supportLedger(fetcher: typeof fetch = fetch): RecordSupportEvent {
  return async event => {
    const config=supportLedgerConfig(process.env); if(!config) throw new Error('Ledger unavailable.');
    const response=await fetcher(`${config.origin}/rest/v1/rpc/record_support_test_event`, {
      method:'POST',redirect:'error',headers:{apikey:config.key,'Content-Type':'application/json'},
      body:JSON.stringify({p_event_id:event.eventId,p_event_type:event.eventType,p_session_id:event.sessionId,p_amount:event.amount,p_currency:event.currency,p_state:event.state,p_event_created:event.eventCreated}),
      signal:AbortSignal.timeout(10_000),
    });
    if(!response.ok) throw new Error('Persistence failed.');
    const result:unknown=await response.json();
    if(result!=='recorded' && result!=='duplicate') throw new Error('Unexpected persistence response.');
    return result;
  };
}
