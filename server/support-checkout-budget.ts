import { supportLedgerConfig } from './config/support-ledger.ts';

export type CheckoutAdmission = () => Promise<{ allowed: boolean; retryAfter: number }>;
export function checkoutBudget(fetcher: typeof fetch = fetch): CheckoutAdmission {
  return async () => {
    const config = supportLedgerConfig(process.env);
    if (!config) throw new Error('Protection unavailable.');
    const response = await fetcher(`${config.origin}/rest/v1/rpc/admit_support_test_checkout`, {
      method: 'POST', redirect: 'error', headers: { apikey: config.key, 'Content-Type': 'application/json' },
      body: '{}', signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error('Protection unavailable.');
    const data = await response.json() as Record<string,unknown>;
    if (typeof data['allowed'] !== 'boolean' || !Number.isInteger(data['retry_after']) ||
        Number(data['retry_after']) < 0 || Number(data['retry_after']) > 3600 ||
        (data['allowed'] ? data['retry_after'] !== 0 : Number(data['retry_after']) < 1)) throw new Error('Invalid protection response.');
    return { allowed: data['allowed'], retryAfter: Number(data['retry_after']) };
  };
}
