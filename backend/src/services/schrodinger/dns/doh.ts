/**
 * Optional DNS-over-HTTPS enrichment — second opinion only, never replaces dig.
 * Providers: Cloudflare + Google.
 */

export interface DohAnswer {
  provider: 'cloudflare' | 'google';
  aRecords: string[];
  error?: string;
}

async function queryDoh(
  url: string,
  provider: DohAnswer['provider'],
  timeoutMs = 4000,
): Promise<DohAnswer> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/dns-json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      return { provider, aRecords: [], error: `HTTP ${res.status}` };
    }
    const body = (await res.json()) as {
      Answer?: Array<{ type: number; data: string }>;
    };
    const aRecords = (body.Answer ?? [])
      .filter((a) => a.type === 1)
      .map((a) => a.data)
      .filter((ip) => /^\d+\.\d+\.\d+\.\d+$/.test(ip));
    return { provider, aRecords };
  } catch (err) {
    return {
      provider,
      aRecords: [],
      error: err instanceof Error ? err.message : 'DoH failed',
    };
  } finally {
    clearTimeout(t);
  }
}

export async function enrichWithDoh(target: string): Promise<DohAnswer[]> {
  const name = encodeURIComponent(target);
  return Promise.all([
    queryDoh(`https://cloudflare-dns.com/dns-query?name=${name}&type=A`, 'cloudflare'),
    queryDoh(`https://dns.google/resolve?name=${name}&type=A`, 'google'),
  ]);
}
