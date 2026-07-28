import type { DnsMode } from '../../../types/schrodinger.js';
import { DigDnsProvider, isDigAvailable } from './digProvider.js';
import { MockDnsProvider } from './mockProvider.js';
import type { DnsProvider } from './types.js';

export async function createDnsProvider(
  mode: DnsMode,
): Promise<{ provider: DnsProvider; notices: string[] }> {
  const notices: string[] = [];

  if (mode === 'mock') {
    return { provider: new MockDnsProvider(), notices };
  }

  if (mode === 'dig') {
    const ok = await isDigAvailable();
    if (!ok) {
      throw new Error(
        'dig chýba v PATH. Nainštaluj bind-tools/dnsutils, alebo nastav SCHRODINGER_DNS_MODE=mock.',
      );
    }
    return { provider: new DigDnsProvider(), notices };
  }

  // auto
  const ok = await isDigAvailable();
  if (!ok) {
    notices.push(
      'dig nie je v PATH — DNS vantage používa MockDnsProvider (auto fallback).',
    );
    return { provider: new MockDnsProvider(), notices };
  }
  return { provider: new DigDnsProvider(), notices };
}
