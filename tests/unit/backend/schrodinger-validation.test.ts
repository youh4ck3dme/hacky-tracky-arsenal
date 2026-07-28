import { describe, expect, it } from 'vitest';
import { schrodingerScanner } from '../../../backend/src/services/schrodingerScanner.js';

describe('schrodingerScanner.validateTarget', () => {
  it('accepts example.com', () => {
    expect(schrodingerScanner.validateTarget('example.com')).toBe('example.com');
  });

  it('normalizes to lowercase', () => {
    expect(schrodingerScanner.validateTarget('Example.COM')).toBe('example.com');
  });

  it('rejects empty target', () => {
    expect(() => schrodingerScanner.validateTarget('')).toThrow(/Invalid domain/);
  });

  it('rejects IP addresses', () => {
    expect(() => schrodingerScanner.validateTarget('192.168.1.1')).toThrow(
      /IP addresses not supported|Invalid domain/,
    );
  });

  it('rejects invalid domain format', () => {
    expect(() => schrodingerScanner.validateTarget('not-a-domain')).toThrow(/Invalid domain/);
  });
});

