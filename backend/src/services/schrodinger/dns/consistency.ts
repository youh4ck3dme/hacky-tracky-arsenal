import type { ResolverAnswer } from './types.js';

/**
 * Consistency score 0–100:
 * - rewards successful answers and agreement on A-record sets
 * - penalizes timeouts and split-horizon
 */
export function computeConsistencyScore(
  answers: ResolverAnswer[],
  sampled: number,
): { score: number; uniqueASets: number; successCount: number } {
  if (sampled <= 0) {
    return { score: 0, uniqueASets: 0, successCount: 0 };
  }

  const ok = answers.filter((a) => a.ok && a.aRecords.length > 0);
  const successCount = ok.length;
  const unique = new Set(ok.map((a) => [...a.aRecords].sort().join(',')));
  const uniqueASets = unique.size;

  if (successCount === 0) {
    return { score: 0, uniqueASets: 0, successCount: 0 };
  }

  const successRate = successCount / sampled;
  // Perfect agreement → 1; two sets → 0.5; three → ~0.33
  const agreement = 1 / uniqueASets;
  // Mild penalty when many resolvers fail
  const reliability = 0.5 + 0.5 * successRate;
  const score = Math.round(100 * successRate * agreement * reliability);
  return {
    score: Math.max(0, Math.min(100, score)),
    uniqueASets,
    successCount,
  };
}

export function isSplitHorizon(uniqueASets: number, successCount: number): boolean {
  return uniqueASets >= 2 && successCount >= 2;
}
