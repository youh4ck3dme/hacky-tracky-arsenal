import { describe, expect, it } from 'vitest';
import { getToolSuggestion } from '../../../backend/src/schrodinger/toolBridge.js';

describe('Arsenal Tool Bridge', () => {
  it('maps dns-wildcard-inconsistency to dig', () => {
    const suggestion = getToolSuggestion('dns-wildcard-inconsistency');
    expect(suggestion?.suggestedModule).toBe('dig');
    expect(suggestion?.category).toBe('dns');
  });

  it('maps temporal-ghost-path to ffuf', () => {
    const suggestion = getToolSuggestion('temporal-ghost-path');
    expect(suggestion?.suggestedModule).toBe('ffuf');
    expect(suggestion?.category).toBe('recon');
  });

  it('provides category fallback for unknown rules', () => {
    const suggestion = getToolSuggestion('dns-custom-rule');
    expect(suggestion?.suggestedModule).toBe('dig');
  });
});
