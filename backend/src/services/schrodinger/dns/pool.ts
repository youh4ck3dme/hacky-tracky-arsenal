/** Simple concurrency pool with optional jitter between starts. */
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
  opts?: { jitterMs?: number },
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Math.min(Math.max(1, concurrency), items.length);

  async function worker(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      if (opts?.jitterMs && opts.jitterMs > 0) {
        const j = Math.floor(Math.random() * opts.jitterMs);
        if (j > 0) await sleep(j);
      }
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function sampleResolvers(all: string[], n: number): string[] {
  if (all.length <= n) return [...all];
  const copy = [...all];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
