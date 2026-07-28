import { describe, expect, it } from 'vitest';
import { triageFindingsWithVertexAI } from '../../../backend/src/schrodinger/triage/vertexTriage.js';

describe('Vertex AI Triage Adapter', () => {
  it('returns structured fallback when flag or API key is missing', async () => {
    const result = await triageFindingsWithVertexAI('example.com', [], 'sk');

    expect(result.target).toBe('example.com');
    expect(result.fallbackUsed).toBe(true);
    expect(result.topActions).toHaveLength(5);
    expect(result.topActions[0].language).toBe('sk');
  });

  it('supports English language fallback', async () => {
    const result = await triageFindingsWithVertexAI('example.com', [], 'en');

    expect(result.topActions[0].language).toBe('en');
    expect(result.topActions[0].title).toContain('DNS');
  });
});
