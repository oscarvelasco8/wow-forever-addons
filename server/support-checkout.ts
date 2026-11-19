import Stripe from 'stripe';
import { readSiteOrigin } from './config/site.ts';
import { supportLedgerConfig } from './config/support-ledger.ts';
import { SUPPORT_AMOUNTS } from './config/support-policy.ts';
export { SUPPORT_AMOUNTS } from './config/support-policy.ts';

export function supportConfig(env: NodeJS.ProcessEnv) {
  if (env['STRIPE_TEST_CHECKOUT_ENABLED'] !== 'true') return null;
  if (!/^[a-f0-9]{64}$/i.test(env['SUPPORT_RECEIPT_SECRET'] ?? '')) return null;
  if (!supportLedgerConfig(env) || env['STRIPE_TEST_WEBHOOK_ENABLED'] !== 'true' ||
      !/^whsec_[A-Za-z0-9]{16,}$/.test(env['STRIPE_TEST_WEBHOOK_SECRET'] ?? '')) return null;
  const key = env['STRIPE_TEST_SECRET_KEY'];
  if (!key || !/^sk_test_[A-Za-z0-9]{16,}$/.test(key)) return null;
  const origin = readSiteOrigin(env['STRIPE_TEST_SITE_URL']);
  return origin ? { key, origin } : null;
}

export type CheckoutInput = { amount: number; attemptId: string };
export function checkoutInput(value: unknown): CheckoutInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (Object.keys(row).sort().join(',') !== 'amount,attemptId' ||
      !SUPPORT_AMOUNTS.includes(row['amount'] as typeof SUPPORT_AMOUNTS[number]) ||
      typeof row['attemptId'] !== 'string' ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(row['attemptId'])) return null;
  return row as CheckoutInput;
}

export type CreateSupportSession = (config: NonNullable<ReturnType<typeof supportConfig>>, input: CheckoutInput) => Promise<{url: string | null; livemode: boolean; id: string}>;
export function stripeSupportSession(fetcher?: typeof fetch): CreateSupportSession { return async (config, input) => {
  const stripe = new Stripe(config.key, { apiVersion: '2026-11-18.endive', timeout: 10_000, maxNetworkRetries: 0,
    httpClient: Stripe.createFetchHttpClient(fetcher) });
  return stripe.checkout.sessions.create({
    mode: 'payment', allowed_payment_method_types: ['card'], locale: 'es',
    success_url: `${config.origin}/apoyar?checkout=return&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.origin}/apoyar?checkout=cancelled`,
    line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: input.amount,
      product_data: { name: 'Aportación voluntaria · WoW Forever Addons',
        description: 'Prueba de apoyo a la plataforma. Sin acceso ni ventajas asociados.' } } }],
    metadata: { purpose: 'platform_support_test', integration: 'wfa_support_v1' },
    payment_intent_data: { metadata: { purpose: 'platform_support_test', integration: 'wfa_support_v1' } },
    custom_text: { submit: { message: 'Modo de pruebas. Aportación puntual y voluntaria, sin funciones ni ventajas.' } },
  }, { idempotencyKey: `wfa-support-test-v2-${input.attemptId}` });
}; }
export const createSupportSession = stripeSupportSession();

export function validTestCheckout(session: {url: string | null; livemode: boolean; id: string}): string | null {
  if (session.livemode !== false || !/^cs_test_[A-Za-z0-9_]+$/.test(session.id) || !session.url) return null;
  const url = new URL(session.url);
  return url.protocol === 'https:' && url.hostname === 'checkout.stripe.com' && !url.port &&
    !url.username && !url.password && ['/c/pay/','/g/pay/'].some(prefix=>url.pathname===prefix+session.id) ? url.href : null;
}
