import { describe, expect, it, afterEach } from 'vitest';
import { executeMultiRegionProbe } from '../../../backend/src/schrodinger/vantage/multiRegion.js';

describe('Multi-Region Egress Probe', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    delete process.env.FEATURE_schrodinger_multi_region;
  });

  it('throws error when multi-region flag is disabled', async () => {
    delete process.env.FEATURE_schrodinger_multi_region;
    await expect(executeMultiRegionProbe('example.com')).rejects.toThrow(/disabled/);
  });

  it('executes up to 2 regions with cost guard when enabled', async () => {
    process.env.FEATURE_schrodinger_multi_region = 'true';
    const result = await executeMultiRegionProbe('example.com');
    expect(result.regionsScanned).toHaveLength(2);
    expect(result.results).toHaveLength(2);
  });
});
