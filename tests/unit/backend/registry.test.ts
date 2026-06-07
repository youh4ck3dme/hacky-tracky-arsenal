import { describe, expect, it } from 'vitest';
import { ALLOWED_SCRIPTS, getModule } from '../../../backend/src/registry.js';

describe('registry', () => {
  it('ALLOWED_SCRIPTS lists six modules', () => {
    expect(Object.keys(ALLOWED_SCRIPTS)).toHaveLength(6);
    expect(ALLOWED_SCRIPTS).toMatchObject({
      exploit: 'exploit-tools.sh',
      web: 'web-hacking.sh',
      network: 'network-tools.sh',
      malware: 'malware-tools.sh',
      ai: 'ai-tools.sh',
      full: 'full-install.sh',
    });
  });

  it('getModule returns ai module definition', () => {
    const mod = getModule('ai');
    expect(mod).toBeDefined();
    expect(mod!.id).toBe('ai');
    expect(mod!.toolIds.length).toBeGreaterThan(0);
  });

  it('getModule returns undefined for invalid id', () => {
    expect(getModule('not-a-module')).toBeUndefined();
  });
});
