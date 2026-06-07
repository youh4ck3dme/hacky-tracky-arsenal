import { describe, expect, it } from 'vitest';
import { getProgressTotal } from '../../../backend/src/services/scriptRunner.js';

describe('scriptRunner', () => {
  it('getProgressTotal for ai module is greater than zero', () => {
    expect(getProgressTotal('ai')).toBeGreaterThan(0);
  });

  it('getProgressTotal for invalid module is zero', () => {
    expect(getProgressTotal('invalid-module')).toBe(0);
  });
});
